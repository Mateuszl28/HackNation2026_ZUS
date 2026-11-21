import { DEFAULT_PARAMS, type Params } from "./params.ts";

export type InsuranceTitle = "employment" | "mandate" | "business" | "none";
export type Scenario = "birth" | "adoption" | "foster";
export type Prematurity = "none" | "extreme" | "premature" | "termHospital";
export type Who = "mother" | "father";

export interface ParentInput {
  title: InsuranceTitle;
  /** Miesięczny przychód brutto (umowa o pracę/zlecenie) lub zadeklarowana podstawa składek (działalność). */
  monthlyBase: number;
  /** Czy podstawa jest już "na rękę ZUS" (po odliczeniu 13,71%) – np. z dokumentu Z-3. */
  baseAlreadyNet?: boolean;
  /** Data rozpoczęcia ubezpieczenia chorobowego (ISO). */
  insuredSince?: string;
  /** Data ustania ubezpieczenia przed porodem (ISO) – jeżeli dotyczy. */
  insuredUntil?: string;
  /** Pracodawca zgłasza > 20 ubezpieczonych → wypłaca zasiłek sam. */
  largeEmployer?: boolean;
  /** Zadłużenie składkowe (działalność). */
  contributionDebt?: number;
  age?: number;
}

export interface CalcInput {
  scenario: Scenario;
  /** Data porodu / przewidywana data porodu / data przyjęcia dziecka (ISO). */
  eventDate: string;
  children: number;
  zaZyciem?: boolean;
  childAgeYears?: number; // adopcja / rodzina zastępcza
  schoolDeferral?: boolean;
  prematurity?: Prematurity;
  hospitalDays?: number;
  stillbirth?: boolean;
  mother: ParentInput;
  father: ParentInput;
  plan: {
    prenatalWeeks?: number; // urlop przed porodem (max 6)
    fatherTakesMaternityWeeks?: number; // przejęcie części macierzyńskiego po 14 tyg.
    fatherParentalWeeks?: number; // tygodnie rodzicielskiego ojca (min. 9 nieprzenoszalnych, jeśli chce wykorzystać)
    motherParentalWeeks?: number; // tygodnie rodzicielskiego matki
    paternity?: boolean;
    oneApplication?: boolean; // 81,5% – wniosek do 21 dni po porodzie
    /** Łączenie rodzicielskiego z pracą – część etatu (0–0.5). */
    workFraction?: { who: Who; fraction: number };
  };
}

export type PeriodType =
  | "prenatal"
  | "maternity"
  | "maternityFather"
  | "adoptionMaternity"
  | "supplementary"
  | "parental"
  | "paternity";

export interface Period {
  who: Who;
  type: PeriodType;
  label: string;
  start: string;
  end: string;
  days: number;
  weeks: number;
  rate: number;
  monthlyAmount: number;
  total: number;
  note?: string;
}

export interface Notice {
  level: "info" | "warning" | "danger";
  title: string;
  text: string;
}

export interface ParentResult {
  eligible: boolean;
  reason: string;
  base: number; // podstawa wymiaru (po 13,71%)
  dailyBase: number;
  payer: "employer" | "zus" | null;
  total: number;
}

export interface CalcResult {
  periods: Period[];
  mother: ParentResult;
  father: ParentResult;
  total: number;
  limits: {
    maternityWeeks: number;
    parentalWeeks: number;
    supplementaryWeeks: number;
    nonTransferableWeeks: number;
    parentalDeadline: string;
  };
  notices: Notice[];
  documents: { who: Who; name: string; where: string; when: string }[];
}

// ---------- helpers ----------
const DAY = 86_400_000;
export const parseDate = (s: string) => new Date(s + "T00:00:00Z");
export const fmt = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => fmt(new Date(parseDate(s).getTime() + n * DAY));
export const diffDays = (a: string, b: string) => Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / DAY);
const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeBase(p: ParentInput, params: Params = DEFAULT_PARAMS): number {
  if (p.title === "none" || !p.monthlyBase) return 0;
  let base = p.baseAlreadyNet ? p.monthlyBase : p.monthlyBase * (1 - params.socialContributionEmployeeRate);
  if (p.title === "business" || p.title === "mandate") {
    const cap = params.voluntaryBaseCapMonthly * (1 - params.socialContributionEmployeeRate);
    if (p.title === "business") base = Math.min(base, cap);
  }
  return round2(base);
}

function insuredOn(p: ParentInput, date: string) {
  if (p.title === "none") return false;
  if (p.insuredSince && p.insuredSince > date) return false;
  if (p.insuredUntil && p.insuredUntil < date) return false;
  return true;
}

function payerFor(p: ParentInput): "employer" | "zus" {
  return (p.title === "employment" || p.title === "mandate") && p.largeEmployer ? "employer" : "zus";
}

export function maternityWeeks(children: number, params: Params = DEFAULT_PARAMS) {
  const arr = params.maternityWeeksByChildren;
  return arr[Math.min(Math.max(children, 1), arr.length) - 1];
}

export function parentalWeeks(children: number, zaZyciem: boolean, params: Params = DEFAULT_PARAMS) {
  const w = params.parentalWeeks;
  if (zaZyciem) return children > 1 ? w.zaZyciemMultiple : w.zaZyciemSingle;
  return children > 1 ? w.multiple : w.single;
}

export function supplementaryWeeks(prem: Prematurity, hospitalDays: number, params: Params = DEFAULT_PARAMS) {
  const s = params.supplementary;
  const weeksFromDays = Math.ceil(Math.max(hospitalDays, 0) / 7);
  switch (prem) {
    case "extreme":
      return Math.min(s.extremePrematureMaxWeeks, weeksFromDays);
    case "premature":
      return Math.min(s.prematureMaxWeeks, weeksFromDays);
    case "termHospital":
      return hospitalDays >= s.termMinHospitalDays ? Math.min(s.termHospitalMaxWeeks, weeksFromDays) : 0;
    default:
      return 0;
  }
}

// ---------- main ----------
export function calculate(input: CalcInput, params: Params = DEFAULT_PARAMS): CalcResult {
  const notices: Notice[] = [];
  const documents: CalcResult["documents"] = [];
  const periods: Period[] = [];
  const ev = input.eventDate;
  const children = Math.max(1, input.children || 1);
  const isBirth = input.scenario === "birth";

  const mBase = computeBase(input.mother, params);
  const fBase = computeBase(input.father, params);
  const mIns = insuredOn(input.mother, ev);
  const fIns = insuredOn(input.father, ev);

  const mother: ParentResult = {
    eligible: mIns && mBase > 0,
    reason: mIns ? "Podlega ubezpieczeniu chorobowemu w dniu porodu/przyjęcia dziecka." : "Brak ubezpieczenia chorobowego w dniu porodu/przyjęcia dziecka – zasiłek macierzyński nie przysługuje.",
    base: mBase,
    dailyBase: round2(mBase / 30),
    payer: mIns ? payerFor(input.mother) : null,
    total: 0,
  };
  const father: ParentResult = {
    eligible: fIns && fBase > 0,
    reason: fIns ? "Podlega ubezpieczeniu chorobowemu." : "Brak ubezpieczenia chorobowego – zasiłek macierzyński nie przysługuje.",
    base: fBase,
    dailyBase: round2(fBase / 30),
    payer: fIns ? payerFor(input.father) : null,
    total: 0,
  };

  const monthly = (base: number, rate: number) => round2(Math.max(base * rate, base > 0 ? params.minBenefitMonthly : 0));
  const push = (who: Who, type: PeriodType, label: string, start: string, days: number, rate: number, note?: string) => {
    if (days <= 0) return start;
    const base = who === "mother" ? mBase : fBase;
    const m = monthly(base, rate);
    const total = round2((m / 30) * days);
    periods.push({ who, type, label, start, end: addDays(start, days - 1), days, weeks: round2(days / 7), rate, monthlyAmount: m, total, note });
    return addDays(start, days);
  };

  // --- limity ---
  let matWeeks = maternityWeeks(children, params);
  let parWeeks = parentalWeeks(children, !!input.zaZyciem, params);
  const suppWeeks = isBirth ? supplementaryWeeks(input.prematurity ?? "none", input.hospitalDays ?? 0, params) : 0;
  const nonTransf = params.parentalNonTransferableWeeks;

  // adopcja / rodzina zastępcza – limit wieku
  if (!isBirth) {
    const age = input.childAgeYears ?? 0;
    const max =
      input.scenario === "adoption"
        ? params.adoption.maxAgeAdoption
        : input.schoolDeferral
          ? params.adoption.maxAgeFosterDeferred
          : params.adoption.maxAgeFoster;
    if (age >= max) {
      notices.push({ level: "danger", title: "Przekroczony wiek dziecka", text: `Urlop na warunkach urlopu macierzyńskiego przysługuje do ukończenia przez dziecko ${max} lat.` });
      matWeeks = 0;
      parWeeks = 0;
    }
    if (input.scenario === "foster") {
      notices.push({ level: "info", title: "Rodzina zastępcza niezawodowa", text: "Przysługuje urlop na warunkach urlopu macierzyńskiego i rodzicielski. Urlop ojcowski przysługuje tylko przy przysposobieniu (adopcji)." });
    }
  }

  // martwe urodzenie
  if (isBirth && input.stillbirth) {
    matWeeks = params.stillbirthWeeks;
    parWeeks = 0;
    notices.push({
      level: "info",
      title: "Urodzenie martwego dziecka",
      text: `Przysługuje zasiłek macierzyński za ${params.stillbirthWeeks} tygodni po porodzie (nie krócej niż ${params.minDaysAfterChildDeath} dni od dnia zgonu). Urlop rodzicielski nie przysługuje. Do wniosku dołącz zaświadczenie o martwym urodzeniu / skrócony akt urodzenia z adnotacją.`,
    });
  }

  const parentalDeadlineYear = parseDate(ev).getUTCFullYear() + (isBirth ? params.parentalMaxChildAgeYears : Math.max(0, params.parentalMaxChildAgeYears - (input.childAgeYears ?? 0)));
  const parentalDeadline = `${parentalDeadlineYear}-12-31`;

  const plan = input.plan ?? {};
  const oneApp = !!plan.oneApplication && mother.eligible;
  const mRateMat = oneApp ? params.rates.oneApplication : params.rates.maternity;
  const mRatePar = oneApp ? params.rates.oneApplication : params.rates.parental;

  // --- macierzyński ---
  let cursor = ev;
  const motherCanMaternity = mother.eligible;
  if (matWeeks > 0) {
    if (isBirth) {
      const prenatal = Math.min(plan.prenatalWeeks ?? 0, params.prenatalMaxWeeks);
      const fatherTake = input.stillbirth ? 0 : Math.max(0, Math.min(plan.fatherTakesMaternityWeeks ?? 0, matWeeks - params.motherObligatoryWeeks));
      if (motherCanMaternity) {
        const start = addDays(ev, -prenatal * 7);
        cursor = push("mother", "maternity", "Urlop macierzyński (matka)", start, (matWeeks - fatherTake) * 7, mRateMat, prenatal ? `W tym ${prenatal} tyg. przed porodem` : undefined);
        if (fatherTake > 0) {
          if (father.eligible) cursor = push("father", "maternityFather", "Część urlopu macierzyńskiego przejęta przez ojca", cursor, fatherTake * 7, params.rates.maternity);
          else notices.push({ level: "warning", title: "Ojciec nie może przejąć urlopu", text: "Ojciec nie podlega ubezpieczeniu chorobowemu – nie otrzyma zasiłku za przejętą część urlopu macierzyńskiego." });
        }
      } else if (father.eligible && !input.stillbirth) {
        notices.push({
          level: "warning",
          title: "Matka nieubezpieczona",
          text: "Matka nie ma prawa do zasiłku macierzyńskiego. Ojciec może skorzystać z urlopu rodzicielskiego (cała pula) oraz ojcowskiego; zasiłek macierzyński za okres macierzyńskiego przysługuje ojcu tylko w szczególnych sytuacjach (np. hospitalizacja, śmierć, porzucenie dziecka przez matkę).",
        });
      }
    } else {
      // adopcja / rodzina zastępcza – może skorzystać jedno z rodziców
      const who: Who = mother.eligible ? "mother" : father.eligible ? "father" : "mother";
      if (mother.eligible || father.eligible) cursor = push(who, "adoptionMaternity", "Urlop na warunkach urlopu macierzyńskiego", ev, matWeeks * 7, who === "mother" ? mRateMat : params.rates.maternity);
    }
  }

  // --- uzupełniający ---
  if (suppWeeks > 0 && !input.stillbirth) {
    const who: Who = mother.eligible ? "mother" : "father";
    if (mother.eligible || father.eligible) {
      cursor = push(who, "supplementary", "Uzupełniający urlop macierzyński", cursor, suppWeeks * 7, params.rates.maternity, "Jednorazowo, bezpośrednio po urlopie macierzyńskim");
      documents.push({ who, name: "Zaświadczenie ze szpitala o pobycie dziecka (podstawa uzupełniającego urlopu macierzyńskiego)", where: mother.payer === "employer" ? "Pracodawca" : "ZUS (eZUS)", when: "Razem z wnioskiem o urlop/zasiłek" });
    }
  }
  if (params.supplementary.verify && suppWeeks > 0)
    notices.push({ level: "info", title: "Uzupełniający urlop macierzyński", text: `Wymiar: ${suppWeeks} tyg. (1 tydzień za każde rozpoczęte 7 dni hospitalizacji, limit zależny od tygodnia ciąży i masy urodzeniowej).` });

  // --- rodzicielski ---
  if (parWeeks > 0) {
    const mAvail = mother.eligible ? parWeeks - (father.eligible ? nonTransf : 0) : 0;
    const fAvail = father.eligible ? parWeeks - (mother.eligible ? nonTransf : 0) : 0;
    let mPar = Math.min(plan.motherParentalWeeks ?? (mother.eligible ? mAvail : 0), mAvail);
    let fPar = Math.min(plan.fatherParentalWeeks ?? 0, fAvail);
    if (mPar + fPar > parWeeks) fPar = parWeeks - mPar;
    mPar = Math.max(0, mPar);
    fPar = Math.max(0, fPar);

    const wf = plan.workFraction;
    const seg = (who: Who, weeks: number, rate: number) => {
      if (weeks <= 0) return;
      const f = wf && wf.who === who ? Math.min(Math.max(wf.fraction, 0), 0.5) : 0;
      if (f > 0) {
        const days = Math.round((weeks * 7) / (1 - f));
        cursor = push(who, "parental", `Urlop rodzicielski (${who === "mother" ? "matka" : "ojciec"}) + praca ${Math.round(f * 100)}% etatu`, cursor, days, rate * (1 - f), `Urlop wydłużony proporcjonalnie (${weeks} tyg. → ${round2(days / 7)} tyg.), zasiłek proporcjonalnie niższy; dochodzi wynagrodzenie za pracę.`);
      } else {
        cursor = push(who, "parental", `Urlop rodzicielski (${who === "mother" ? "matka" : "ojciec"})`, cursor, weeks * 7, rate);
      }
    };
    seg("mother", mPar, mRatePar);
    seg("father", fPar, params.rates.parental);

    if (mother.eligible && father.eligible && fPar < nonTransf)
      notices.push({ level: "warning", title: `${nonTransf} tygodni ojca przepada`, text: `Każdemu z rodziców przysługuje ${nonTransf} tygodni urlopu rodzicielskiego, których nie można przenieść. Jeśli ojciec ich nie wykorzysta, przepadną (do końca roku, w którym dziecko kończy ${params.parentalMaxChildAgeYears} lat).` });
    const unused = parWeeks - mPar - fPar;
    if (unused > 0 && (mother.eligible || father.eligible))
      notices.push({ level: "info", title: "Niewykorzystany urlop rodzicielski", text: `Pozostaje ${unused} tyg. urlopu rodzicielskiego. Można go wykorzystać w maks. ${params.parentalMaxParts} częściach do ${parentalDeadline}.` });
    if (oneApp && mPar < mAvail)
      notices.push({ level: "warning", title: "Ryzyko zwrotu przy 81,5%", text: "Wybrano jednorazowy wniosek (81,5%), ale matka nie wykorzysta całego urlopu rodzicielskiego. ZUS/pracodawca wyrówna zasiłek do 70% za okres rodzicielski – nadwyżka zostanie potrącona." });
  }

  // --- ojcowski ---
  const paternityAllowed = input.scenario !== "foster" && !input.stillbirth;
  if (plan.paternity && paternityAllowed) {
    if (father.eligible) {
      const start = isBirth ? ev : ev;
      push("father", "paternity", "Urlop ojcowski", start, params.paternityDays, params.rates.maternity, `Do wykorzystania jednorazowo lub w 2 częściach (min. 7 dni) do ${isBirth ? "ukończenia przez dziecko 12 mies." : "12 mies. od uprawomocnienia przysposobienia (max 14 lat dziecka)"}.`);
    } else notices.push({ level: "warning", title: "Brak prawa do zasiłku za urlop ojcowski", text: "Ojciec nie podlega ubezpieczeniu chorobowemu." });
  }

  // --- ryzyka ---
  for (const [who, p] of [["mother", input.mother], ["father", input.father]] as const) {
    const name = who === "mother" ? "Matka" : "Ojciec";
    if (p.title === "business") {
      notices.push({ level: "warning", title: `${name}: działalność gospodarcza`, text: "Ubezpieczenie chorobowe jest dobrowolne – nieopłacenie składki w terminie powoduje jego ustanie. Przy zadłużeniu zasiłek zostanie wypłacony dopiero po spłacie." });
      if ((p.contributionDebt ?? 0) > 0)
        notices.push({ level: "danger", title: `${name}: zadłużenie składkowe ${p.contributionDebt!.toFixed(2)} zł`, text: "Ureguluj zadłużenie – do czasu spłaty ZUS nie wypłaci zasiłku." });
    }
    if (p.insuredSince && diffDays(p.insuredSince, ev) < 180 && p.title !== "none")
      notices.push({ level: "warning", title: `${name}: krótki okres ubezpieczenia`, text: "Ubezpieczenie rozpoczęte krótko przed porodem może zostać zweryfikowane przez ZUS (umowa dla pozoru, zawyżona podstawa). Przygotuj dokumenty potwierdzające faktyczne wykonywanie pracy." });
    if (p.insuredUntil && p.insuredUntil < ev && p.title !== "none")
      notices.push({ level: "danger", title: `${name}: ubezpieczenie ustaje przed porodem`, text: "Zakończenie umowy / działalności przed porodem oznacza brak prawa do zasiłku macierzyńskiego (wyjątki: likwidacja/upadłość pracodawcy – zasiłek w wysokości zasiłku macierzyńskiego)." });
  }

  // --- dokumenty ---
  const docFor = (who: Who, p: ParentInput, r: ParentResult) => {
    if (!r.eligible) return;
    const has = periods.some((x) => x.who === who);
    if (!has) return;
    if (p.title === "employment") {
      documents.push({ who, name: "Wniosek o urlop macierzyński/rodzicielski/ojcowski (do pracodawcy)", where: "Pracodawca", when: "Rodzicielski/ojcowski: min. 21 dni przed rozpoczęciem" });
      if (r.payer === "zus") documents.push({ who, name: "Z-3 – zaświadczenie płatnika składek (wystawia pracodawca)", where: "Pracodawca → ZUS", when: "Po złożeniu wniosku" });
    } else if (p.title === "mandate") {
      documents.push({ who, name: "ZAM – wniosek o zasiłek macierzyński", where: r.payer === "employer" ? "Płatnik składek (zleceniodawca)" : "ZUS (eZUS)", when: "Po porodzie / przed okresem" });
      if (r.payer === "zus") documents.push({ who, name: "Z-3a – zaświadczenie płatnika składek", where: "Zleceniodawca → ZUS", when: "Po złożeniu ZAM" });
    } else if (p.title === "business") {
      documents.push({ who, name: "ZAM – wniosek o zasiłek macierzyński", where: "ZUS (eZUS)", when: "Po porodzie / przed okresem" });
    }
  };
  docFor("mother", input.mother, mother);
  docFor("father", input.father, father);
  if (isBirth) documents.push({ who: "mother", name: "Skrócony odpis aktu urodzenia dziecka (lub dane z rejestru stanu cywilnego)", where: "Pracodawca / ZUS", when: "Po rejestracji urodzenia" });
  if (oneApp) documents.push({ who: "mother", name: "Wniosek o zasiłek 81,5% za cały okres (macierzyński + rodzicielski)", where: mother.payer === "employer" ? "Pracodawca" : "ZUS (eZUS)", when: `Nie później niż ${params.oneApplicationDeadlineDays} dni po porodzie` });
  if (input.zaZyciem) documents.push({ who: "mother", name: "Zaświadczenie „Za życiem”", where: "Pracodawca / ZUS", when: "Razem z wnioskiem o urlop rodzicielski" });
  if (plan.prenatalWeeks) documents.push({ who: "mother", name: "Zaświadczenie lekarskie o przewidywanej dacie porodu", where: "Pracodawca / ZUS", when: "Przed rozpoczęciem urlopu przed porodem" });
  if (!isBirth) documents.push({ who: mother.eligible ? "mother" : "father", name: input.scenario === "adoption" ? "Zaświadczenie sądu o wszczęciu postępowania o przysposobienie" : "Postanowienie sądu / umowa o rodzinę zastępczą niezawodową", where: "Pracodawca / ZUS", when: "Razem z wnioskiem" });

  mother.total = round2(periods.filter((p) => p.who === "mother").reduce((s, p) => s + p.total, 0));
  father.total = round2(periods.filter((p) => p.who === "father").reduce((s, p) => s + p.total, 0));

  return {
    periods,
    mother,
    father,
    total: round2(mother.total + father.total),
    limits: { maternityWeeks: matWeeks, parentalWeeks: parWeeks, supplementaryWeeks: suppWeeks, nonTransferableWeeks: nonTransf, parentalDeadline },
    notices,
    documents,
  };
}

// ---------- zasiłek chorobowy w ciąży ----------
export interface SicknessInput {
  parent: ParentInput;
  startDate: string;
  days: number;
  usedDaysThisYear?: number; // dni choroby już wykorzystane w roku (wynagrodzenie chorobowe)
}

export function calculatePregnancySickness(i: SicknessInput, params: Params = DEFAULT_PARAMS) {
  const notices: Notice[] = [];
  const p = i.parent;
  const base = computeBase(p, params);
  if (p.title === "none") return { eligible: false, base: 0, employerDays: 0, zusDays: 0, employerAmount: 0, zusAmount: 0, total: 0, notices: [{ level: "danger" as const, title: "Brak ubezpieczenia", text: "Zasiłek chorobowy nie przysługuje bez ubezpieczenia chorobowego." }] };
  const voluntary = p.title === "business" || p.title === "mandate";
  const wait = voluntary ? params.waitingPeriodDays.voluntary : params.waitingPeriodDays.mandatory;
  let eligible = true;
  if (p.insuredSince) {
    const insuredDays = diffDays(p.insuredSince, i.startDate);
    if (insuredDays < wait) {
      eligible = false;
      notices.push({ level: "danger", title: "Okres wyczekiwania", text: `Prawo do zasiłku powstaje po ${wait} dniach ${voluntary ? "dobrowolnego" : "nieprzerwanego"} ubezpieczenia (masz ${insuredDays}). Zasiłek przysługuje od ${addDays(p.insuredSince, wait)}.` });
    }
  }
  const days = Math.min(i.days, params.sicknessPeriodDays);
  const daily = (base * params.rates.sicknessPregnancy) / 30;
  let employerDays = 0;
  if (p.title === "employment") {
    const limit = (p.age ?? 30) >= 50 ? params.employerPaidDays.over50 : params.employerPaidDays.under50;
    employerDays = Math.max(0, Math.min(days, limit - (i.usedDaysThisYear ?? 0)));
  }
  const zusDays = eligible ? days - employerDays : 0;
  notices.push({ level: "info", title: "Kod „B” na e-ZLA", text: "Zasiłek chorobowy w ciąży wynosi 100% podstawy, jeśli zaświadczenie e-ZLA zawiera kod literowy „B”." });
  return {
    eligible,
    base,
    employerDays,
    zusDays,
    employerAmount: round2(daily * employerDays),
    zusAmount: round2(daily * zusDays),
    total: round2(daily * (employerDays + zusDays)),
    notices,
  };
}

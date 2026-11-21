import { addDays, computeBase, diffDays, type Notice, type ParentInput } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Świadczenia w okresie ciąży (wymaganie a): zasiłek chorobowy, świadczenie rehabilitacyjne,
// zasiłek w wysokości zasiłku macierzyńskiego (utrata pracy w ciąży z przyczyn niezależnych).

export type JobLossReason = "bankruptcy" | "liquidation" | "employerDeath" | "unlawful" | "other";

export const JOB_LOSS_LABELS: Record<JobLossReason, string> = {
  bankruptcy: "Upadłość pracodawcy",
  liquidation: "Likwidacja pracodawcy",
  employerDeath: "Śmierć pracodawcy",
  unlawful: "Rozwiązanie umowy z naruszeniem prawa (prawomocny wyrok sądu)",
  other: "Inna przyczyna (np. koniec umowy, porozumienie stron)",
};

export interface PregnancyInput {
  parent: ParentInput;
  dueDate: string; // przewidywana data porodu – od niej zasiłek macierzyński
  sickFrom?: string; // początek niezdolności do pracy (e-ZLA z kodem B)
  sickDays?: number; // łączna przewidywana liczba dni niezdolności
  usedDaysThisYear?: number;
  jobLoss?: { date: string; reason: JobLossReason };
}

export interface PregnancySegment {
  kind: "employerSick" | "sickness" | "rehab" | "maternityEquivalent";
  label: string;
  from: string;
  to: string;
  days: number;
  rate: number;
  amount: number;
  payer: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const minDate = (a: string, b: string) => (a < b ? a : b);

export function calculatePregnancyBenefits(i: PregnancyInput, params: Params = DEFAULT_PARAMS) {
  const notices: Notice[] = [];
  const segments: PregnancySegment[] = [];
  const p = i.parent;
  const base = computeBase(p, params);
  const daily = base / 30;
  const lastBeforeBirth = addDays(i.dueDate, -1);
  const rehabRate = params.rates.rehabPregnancy ?? 1;
  const rehabMax = params.rehabMaxDays ?? 365;

  if (p.title === "none" || !base) {
    notices.push({ level: "danger", title: "Brak ubezpieczenia chorobowego", text: "Bez ubezpieczenia chorobowego nie przysługuje zasiłek chorobowy, świadczenie rehabilitacyjne ani zasiłek macierzyński. Sprawdź możliwość zgłoszenia do dobrowolnego ubezpieczenia (zlecenie/działalność) – prawo do zasiłku chorobowego po 90 dniach." });
    return { base: 0, segments, total: 0, notices };
  }

  const add = (kind: PregnancySegment["kind"], label: string, from: string, days: number, rate: number, payer: string) => {
    if (days <= 0) return from;
    segments.push({ kind, label, from, to: addDays(from, days - 1), days, rate, amount: r2(daily * rate * days), payer });
    return addDays(from, days);
  };

  // --- niezdolność do pracy w ciąży ---
  if (i.sickFrom && (i.sickDays ?? 0) > 0) {
    const voluntary = p.title === "business" || p.title === "mandate";
    const wait = voluntary ? params.waitingPeriodDays.voluntary : params.waitingPeriodDays.mandatory;
    let start = i.sickFrom;
    if (p.insuredSince && diffDays(p.insuredSince, start) < wait) {
      const eligibleFrom = addDays(p.insuredSince, wait);
      notices.push({ level: "danger", title: "Okres wyczekiwania", text: `Prawo do zasiłku chorobowego powstaje po ${wait} dniach ${voluntary ? "dobrowolnego" : "nieprzerwanego"} ubezpieczenia – od ${eligibleFrom}. Za wcześniejsze dni zasiłek nie przysługuje.` });
      start = eligibleFrom;
    }
    // niezdolność kończy się najpóźniej dzień przed porodem (potem zasiłek macierzyński)
    const sickEnd = minDate(addDays(i.sickFrom, (i.sickDays ?? 0) - 1), lastBeforeBirth);
    let remaining = Math.max(0, diffDays(start, sickEnd) + 1);
    let cursor = start;

    if (p.title === "employment") {
      const limit = (p.age ?? 30) >= 50 ? params.employerPaidDays.over50 : params.employerPaidDays.under50;
      const empDays = Math.max(0, Math.min(remaining, limit - (i.usedDaysThisYear ?? 0)));
      cursor = add("employerSick", "Wynagrodzenie chorobowe (płaci pracodawca)", cursor, empDays, params.rates.sicknessPregnancy, "Pracodawca");
      remaining -= empDays;
    }
    const sickPeriodLeft = Math.max(0, params.sicknessPeriodDays - (i.usedDaysThisYear ?? 0) - (segments[0]?.days ?? 0));
    const sickDays = Math.min(remaining, sickPeriodLeft);
    const payer = p.largeEmployer && p.title !== "business" ? "Płatnik składek" : "ZUS";
    cursor = add("sickness", "Zasiłek chorobowy (kod B – 100%)", cursor, sickDays, params.rates.sicknessPregnancy, payer);
    remaining -= sickDays;

    if (remaining > 0) {
      const rehabDays = Math.min(remaining, rehabMax);
      add("rehab", "Świadczenie rehabilitacyjne (w ciąży 100%)", cursor, rehabDays, rehabRate, "ZUS");
      notices.push({ level: "info", title: "Wyczerpany okres zasiłkowy", text: `Po ${params.sicknessPeriodDays} dniach zasiłku chorobowego możesz wystąpić o świadczenie rehabilitacyjne (wniosek ZNp-7 + zaświadczenie lekarza N-9, najlepiej 6 tygodni przed końcem okresu zasiłkowego). Decyzję poprzedza orzeczenie lekarza orzecznika ZUS. W ciąży wynosi 100% podstawy, maks. ${Math.round(rehabMax / 30)} mies.` });
    }
    if (diffDays(i.sickFrom, i.dueDate) <= (i.sickDays ?? 0))
      notices.push({ level: "info", title: "Od porodu – zasiłek macierzyński", text: `Niezdolność do pracy kończy się z dniem porodu (${i.dueDate}). Od tego dnia przysługuje zasiłek macierzyński – złóż wniosek.` });
  }

  // --- utrata pracy w ciąży ---
  if (i.jobLoss) {
    const { date, reason } = i.jobLoss;
    if (p.title !== "employment") {
      notices.push({ level: "warning", title: "Zasiłek w wysokości macierzyńskiego – tylko pracownice", text: "To świadczenie dotyczy kobiet zatrudnionych na umowę o pracę." });
    } else if (reason === "other") {
      notices.push({ level: "danger", title: "Utrata pracy – brak świadczenia do porodu", text: "Rozwiązanie umowy z innej przyczyny niż upadłość, likwidacja lub śmierć pracodawcy (albo bezprawne – potwierdzone wyrokiem) oznacza ustanie ubezpieczenia. Uwaga: umowa na czas określony, która ustałaby po 3. miesiącu ciąży, przedłuża się do dnia porodu. Jeśli jesteś niezdolna do pracy w chwili ustania ubezpieczenia – zasiłek chorobowy przysługuje nadal." });
    } else {
      const from = addDays(date, 1);
      // nie dubluj z okresem choroby – zasiłek chorobowy po ustaniu ubezpieczenia ma pierwszeństwo do końca niezdolności
      const lastSick = segments.length ? segments[segments.length - 1].to : null;
      const start = lastSick && lastSick >= from ? addDays(lastSick, 1) : from;
      const days = Math.max(0, diffDays(start, lastBeforeBirth) + 1);
      add("maternityEquivalent", "Zasiłek w wysokości zasiłku macierzyńskiego (do porodu)", start, days, params.rates.maternity, "ZUS");
      notices.push({ level: "info", title: JOB_LOSS_LABELS[reason], text: `Przysługuje zasiłek w wysokości zasiłku macierzyńskiego (100% podstawy) od dnia następującego po ustaniu zatrudnienia do dnia porodu, jeśli nie zapewniono innego zatrudnienia. Wniosek: ZUS Z-3 od byłego pracodawcy (lub syndyka/likwidatora) + dokument potwierdzający przyczynę${reason === "unlawful" ? " (prawomocny wyrok sądu)" : ""}.` });
    }
  }

  return { base: r2(base), segments, total: r2(segments.reduce((s, x) => s + x.amount, 0)), notices };
}

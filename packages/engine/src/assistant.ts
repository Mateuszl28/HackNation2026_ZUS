import type { CalcInput, CalcResult } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Asystent regułowy: dopasowanie intencji po słowach kluczowych + odpowiedź spersonalizowana wynikiem kalkulatora.
// Deterministyczny – działa offline (także w aplikacji mobilnej). Warstwa AI (opcjonalna) jest w API webu.

const pln = (n: number) => Math.round(n).toLocaleString("pl-PL") + " zł";
const pct = (x: number) => (Math.round(x * 10000) / 100).toLocaleString("pl-PL") + "%";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

interface Intent {
  id: string;
  keys: string[];
  answer: (p: Params, i?: CalcInput, r?: CalcResult) => string;
}

const INTENTS: Intent[] = [
  {
    id: "ile",
    keys: ["ile", "kwot", "wysokosc", "dostane", "pieniad", "zasilek wynosi"],
    answer: (p, i, r) =>
      r
        ? `W Twoim planie: matka ${pln(r.mother.total)}, ojciec ${pln(r.father.total)}, razem ${pln(r.total)}. ` +
          (r.mother.eligible ? `Podstawa wymiaru matki to ${pln(r.mother.base)} (wynagrodzenie po odliczeniu ${pct(p.socialContributionEmployeeRate)} składek). ` : "") +
          `Macierzyński = ${pct(p.rates.maternity)} podstawy, rodzicielski = ${pct(p.rates.parental)}, a przy jednym wniosku ${pct(p.rates.oneApplication)} za cały okres.`
        : `Zasiłek liczy się od podstawy wymiaru (średnie wynagrodzenie z 12 miesięcy minus ${pct(p.socialContributionEmployeeRate)}). Macierzyński ${pct(p.rates.maternity)}, rodzicielski ${pct(p.rates.parental)}.`,
  },
  {
    id: "815",
    keys: ["81", "jeden wniosek", "jednym wniosk", "caly okres"],
    answer: (p) =>
      `Jeśli najpóźniej ${p.oneApplicationDeadlineDays} dni po porodzie złożysz wniosek o zasiłek za cały okres (macierzyński + rodzicielski), dostajesz ${pct(p.rates.oneApplication)} przez cały czas zamiast ${pct(p.rates.maternity)} + ${pct(p.rates.parental)}. Uwaga: jeśli potem nie wykorzystasz całego rodzicielskiego, zasiłek zostanie wyrównany do ${pct(p.rates.parental)}, a nadpłata potrącona. Porównaj oba warianty w kalkulatorze.`,
  },
  {
    id: "ojciec",
    keys: ["ojciec", "tata", "tacie", "taty", "partner", "maz", "ojcowsk", "9 tygodni", "przejac", "przejecie"],
    answer: (p, i, r) =>
      `Ojciec ma: urlop ojcowski ${p.paternityDays} dni (${pct(p.rates.maternity)}, do 12. miesiąca życia dziecka), ${p.parentalNonTransferableWeeks} tyg. rodzicielskiego tylko dla siebie (nie przechodzą na matkę) oraz może przejąć część macierzyńskiego po ${p.motherObligatoryWeeks} tygodniach wykorzystanych przez matkę.` +
      (r && !r.father.eligible ? " W Twoich danych ojciec nie podlega ubezpieczeniu chorobowemu – nie dostanie zasiłku." : ""),
  },
  {
    id: "dzialalnosc",
    keys: ["dzialalnosc", "jdg", "firma", "przedsiebior", "skladk", "zadluz", "dobrowoln"],
    answer: (p, i) =>
      `Przy działalności ubezpieczenie chorobowe jest dobrowolne: prawo do zasiłku chorobowego po ${p.waitingPeriodDays.voluntary} dniach, a spóźniona składka oznacza ustanie ubezpieczenia (chyba że ZUS wyrazi zgodę na opłacenie po terminie). Zasiłek macierzyński nie wymaga okresu wyczekiwania, ale musisz być ubezpieczona w dniu porodu. Zadłużenie trzeba spłacić – do tego czasu ZUS nie wypłaci zasiłku.` +
      ((i?.mother.contributionDebt ?? 0) > 0 ? ` Masz zadłużenie ${pln(i!.mother.contributionDebt!)} – ureguluj je przed porodem.` : ""),
  },
  {
    id: "zlecenie",
    keys: ["zlecen", "umowa zlecenia"],
    answer: (p) => `Na zleceniu chorobowe jest dobrowolne – sprawdź, czy zleceniodawca Cię zgłosił. Wniosek ZAM składasz u płatnika (jeśli zgłasza > 20 osób) albo w ZUS; płatnik dołącza Z-3a. Umowa musi trwać w dniu porodu – jej zakończenie wcześniej oznacza brak zasiłku macierzyńskiego.`,
  },
  {
    id: "l4",
    keys: ["l4", "zwolnien", "chorob", "e-zla", "ezla", "kod b"],
    answer: (p) => `Na zwolnieniu w ciąży (e-ZLA z kodem „B”) dostajesz ${pct(p.rates.sicknessPregnancy)} podstawy. Pracownica: pierwsze ${p.employerPaidDays.under50} dni w roku płaci pracodawca (wynagrodzenie chorobowe), potem zasiłek. Okres wyczekiwania: ${p.waitingPeriodDays.mandatory} dni (etat) lub ${p.waitingPeriodDays.voluntary} dni (dobrowolne). Maksymalnie ${p.sicknessPeriodDays} dni.`,
  },
  {
    id: "wczesniak",
    keys: ["wczesniak", "szpital", "hospitaliz", "uzupelniaj", "przedwczes"],
    answer: (p) => `Przy wcześniaku lub hospitalizacji noworodka przysługuje uzupełniający urlop macierzyński (100%): do ${p.supplementary.extremePrematureMaxWeeks} tyg. (poród przed 28. tc. lub masa ≤ 1000 g), do ${p.supplementary.prematureMaxWeeks} tyg. (28–36 tc.), do ${p.supplementary.termHospitalMaxWeeks} tyg. (od 37. tc.). Wymiar zależy od dni pobytu w szpitalu – potrzebne zaświadczenie ze szpitala. Wsparcie: Fundacja Wcześniak (zakładka Wsparcie).`,
  },
  {
    id: "strata",
    keys: ["martw", "poronien", "strata", "zmarl", "zgon", "smierc"],
    answer: (p) => `Bardzo nam przykro. Po urodzeniu martwego dziecka lub jego śmierci przed 8. tygodniem życia przysługuje zasiłek macierzyński za ${p.stillbirthWeeks} tygodni po porodzie (nie krócej niż ${p.minDaysAfterChildDeath} dni od zgonu), 100% podstawy. Potrzebny jest odpis aktu urodzenia z adnotacją lub karta martwego urodzenia. W zakładce Wsparcie znajdziesz organizacje pomagające po stracie i telefon zaufania 116 123.`,
  },
  {
    id: "adopcja",
    keys: ["adopc", "przysposob", "zastepcz"],
    answer: (p) => `Przy adopcji przysługuje urlop na warunkach urlopu macierzyńskiego (${p.maternityWeeksByChildren[0]} tyg. przy 1 dziecku, do ${p.adoption.maxAgeAdoption}. roku życia dziecka) oraz rodzicielski. Rodzina zastępcza niezawodowa – do ${p.adoption.maxAgeFoster} lat (${p.adoption.maxAgeFosterDeferred} przy odroczeniu obowiązku szkolnego). Urlop ojcowski przy adopcji: 12 mies. od uprawomocnienia przysposobienia.`,
  },
  {
    id: "praca",
    keys: ["praca", "pol etatu", "wrocic", "powrot", "laczyc", "czesc etatu"],
    answer: () => `Urlop rodzicielski możesz łączyć z pracą u tego samego pracodawcy do 1/2 etatu. Urlop wydłuża się proporcjonalnie (np. przy 1/2 etatu 2×), a zasiłek jest proporcjonalnie niższy – dostajesz go razem z pensją. Policz to w kalkulatorze („Łączę urlop rodzicielski z pracą”).`,
  },
  {
    id: "gdzie",
    keys: ["gdzie", "zloz", "wniosek", "dokument", "formularz", "zam", "z-3", "z3"],
    answer: (p, i, r) => {
      const who = r ? (["mother", "father"] as const).filter((w) => r[w].payer).map((w) => `${w === "mother" ? "matce" : "ojcu"} wypłaca ${r[w].payer === "employer" ? "pracodawca" : "ZUS"}`) : [];
      return `Pracownicy składają wniosek o urlop u pracodawcy; jeśli płatnik zgłasza > 20 ubezpieczonych, sam wypłaca zasiłek, w przeciwnym razie przesyła Z-3 do ZUS. Zleceniobiorcy i przedsiębiorcy składają ZAM (od 24.10.2026 zastępuje też ZUR i ZAO) – przez eZUS.${who.length ? " W Twojej sytuacji zasiłek " + who.join(", ") + "." : ""} Pełna lista dokumentów jest pod wynikiem kalkulatora.`;
    },
  },
  {
    id: "utrata",
    keys: ["likwidac", "upadlos", "upadl", "stracilam prace", "stracila prace", "utrata pracy", "smierc pracodawcy", "syndyk"],
    answer: (p) => `Jeśli w ciąży rozwiązano z Tobą umowę o pracę z powodu upadłości, likwidacji lub śmierci pracodawcy (albo z naruszeniem prawa – potwierdzone prawomocnym wyrokiem) i nie masz innej pracy, przysługuje zasiłek w wysokości zasiłku macierzyńskiego (${pct(p.rates.maternity)}) od dnia po ustaniu zatrudnienia do porodu, a potem zasiłek macierzyński. Przy innej przyczynie ubezpieczenie ustaje – ale umowa na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu. Policz to w kalkulatorze (zakładka „W ciąży”).`,
  },
  {
    id: "rehab",
    keys: ["rehabilitac", "270 dni", "okres zasilkowy", "po 270", "dluga choroba"],
    answer: (p) => `Zasiłek chorobowy przysługuje maks. ${p.sicknessPeriodDays} dni. Jeśli dalej jesteś niezdolna do pracy, możesz dostać świadczenie rehabilitacyjne – maks. ${Math.round((p.rehabMaxDays ?? 365) / 30)} mies.; gdy niezdolność przypada w ciąży, wynosi ${pct(p.rates.rehabPregnancy ?? 1)} podstawy. Wniosek ZNp-7 z zaświadczeniem N-9 złóż ok. 6 tygodni przed końcem okresu zasiłkowego; decyduje lekarz orzecznik ZUS.`,
  },
  {
    id: "zwolnienie",
    keys: ["zwolnic", "wypowiedz", "ochron", "umowa na czas okreslony"],
    answer: () => `W ciąży i w czasie urlopów rodzicielskich (od złożenia wniosku) pracodawca nie może wypowiedzieć ani rozwiązać umowy (wyjątek: zawinione rozwiązanie za zgodą związków). Umowa na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu. Ochrona nie dotyczy zleceń ani działalności.`,
  },
];

export interface AssistantAnswer {
  text: string;
  intent: string;
  source: "rules" | "ai";
}

export function answerQuestion(q: string, params: Params = DEFAULT_PARAMS, input?: CalcInput, result?: CalcResult): AssistantAnswer {
  const n = norm(q);
  let best: Intent | null = null;
  let score = 0;
  for (const it of INTENTS) {
    const s = it.keys.reduce((acc, k) => acc + (n.includes(norm(k)) ? k.length : 0), 0);
    if (s > score) {
      score = s;
      best = it;
    }
  }
  if (!best)
    return {
      intent: "fallback",
      source: "rules",
      text: "Nie jestem pewien, o co pytasz. Mogę wyjaśnić: ile wyniesie zasiłek, 81,5%, uprawnienia ojca, L4 w ciąży, działalność/zlecenie, wcześniaki, adopcję, łączenie z pracą, gdzie złożyć dokumenty. W razie wątpliwości zapytaj ZUS przez PUE/eZUS.",
    };
  return { intent: best.id, source: "rules", text: best.answer(params, input, result) };
}

export const SUGGESTED_QUESTIONS = [
  "Ile dostanę zasiłku?",
  "Czy opłaca się 81,5%?",
  "Co przysługuje ojcu?",
  "Mam działalność – na co uważać?",
  "Gdzie złożyć wniosek?",
  "Czy mogę wrócić do pracy na pół etatu?",
];

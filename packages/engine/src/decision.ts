import { diffDays, type CalcInput, type CalcResult } from "./calculator.ts";
import type { DemoCase } from "./cases.ts";

// Rekomendacja rozstrzygnięcia dla urzędnika – reguły (urzędnik zawsze podejmuje decyzję samodzielnie).

export type DecisionType = "grant" | "refuse" | "request";

export const DECISION_LABELS: Record<DecisionType, string> = {
  grant: "Przyznanie świadczenia",
  refuse: "Odmowa prawa do świadczenia",
  request: "Wezwanie do uzupełnienia",
};

export interface Recommendation {
  type: DecisionType;
  confidence: "high" | "medium";
  reasons: string[];
  legalBasis: string[];
  missingDocs: string[];
  manualChecks: string[];
}

export function recommendDecision(input: CalcInput, result: CalcResult, zus?: DemoCase["zusData"]): Recommendation {
  const reasons: string[] = [];
  const legalBasis = ["art. 29 ust. 1 i art. 29a ustawy z dnia 25 czerwca 1999 r. o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa"];
  const missingDocs: string[] = [];
  const manualChecks: string[] = [];
  const ev = input.eventDate;

  // dokumenty oczekiwane w sprawie
  if (input.scenario === "birth") missingDocs.push("Skrócony odpis aktu urodzenia dziecka");
  if (input.scenario === "adoption") missingDocs.push("Zaświadczenie sądu o wszczęciu postępowania o przysposobienie");
  if (input.scenario === "foster") missingDocs.push("Postanowienie sądu o umieszczeniu dziecka w rodzinie zastępczej");
  if (input.zaZyciem) missingDocs.push("Zaświadczenie „Za życiem”");
  if (input.prematurity && input.prematurity !== "none") missingDocs.push("Zaświadczenie ze szpitala o okresie pobytu dziecka w szpitalu");
  if (input.stillbirth) missingDocs.push("Karta martwego urodzenia / odpis aktu urodzenia z adnotacją");

  for (const [who, p, r] of [["matki", input.mother, result.mother], ["ojca", input.father, result.father]] as const) {
    if (p.title === "none") continue;
    if (p.insuredSince && diffDays(p.insuredSince, ev) < 180) {
      manualChecks.push(`Krótki okres ubezpieczenia ${who} (od ${p.insuredSince}) – zweryfikuj faktyczne wykonywanie pracy/działalności (art. 83 ustawy o systemie ubezpieczeń społecznych).`);
    }
    if (r.eligible && (p.title === "employment" || p.title === "mandate") && r.payer === "zus") missingDocs.push(`Zaświadczenie płatnika składek ${p.title === "employment" ? "Z-3" : "Z-3a"} (${who})`);
  }

  const debt = (input.mother.contributionDebt ?? 0) + (input.father.contributionDebt ?? 0) || (zus?.debt ?? 0);
  if (!result.mother.eligible && !result.father.eligible) {
    reasons.push("Żadne z rodziców nie podlegało ubezpieczeniu chorobowemu w dniu porodu / przyjęcia dziecka.");
    if (input.mother.insuredUntil && input.mother.insuredUntil < ev) reasons.push(`Ubezpieczenie matki ustało ${input.mother.insuredUntil}, przed dniem porodu (${ev}).`);
    return { type: "refuse", confidence: "high", reasons, legalBasis, missingDocs: [], manualChecks };
  }
  if (!result.mother.eligible && input.mother.insuredUntil && input.mother.insuredUntil < ev) {
    reasons.push(`Matka: ubezpieczenie ustało ${input.mother.insuredUntil} przed porodem – brak prawa do zasiłku macierzyńskiego. Prawo przysługuje ojcu (urlop rodzicielski/ojcowski).`);
  }
  if (debt > 0) {
    reasons.push(`Zadłużenie z tytułu składek: ${debt.toFixed(2)} zł – wypłata zasiłku po uregulowaniu zadłużenia (art. 49 ustawy zasiłkowej).`);
    legalBasis.push("art. 49 ustawy zasiłkowej");
    missingDocs.unshift("Potwierdzenie spłaty zadłużenia składkowego");
    return { type: "request", confidence: "high", reasons, legalBasis, missingDocs, manualChecks };
  }
  reasons.push(`Spełnione warunki: ubezpieczenie chorobowe w dniu ${input.scenario === "birth" ? "porodu" : "przyjęcia dziecka"}; wymiar: macierzyński ${result.limits.maternityWeeks} tyg., rodzicielski ${result.limits.parentalWeeks} tyg.`);
  legalBasis.push("art. 31 ustawy zasiłkowej (wysokość)", "art. 180–182³ Kodeksu pracy (wymiar urlopów)");
  return { type: "grant", confidence: manualChecks.length ? "medium" : "high", reasons, legalBasis, missingDocs, manualChecks };
}

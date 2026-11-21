import { addDays, diffDays, type CalcInput, type CalcResult } from "./calculator.ts";
import { deadlines } from "./planning.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

export type Phase = "now" | "beforeBirth" | "afterBirth" | "later";
export const PHASE_LABELS: Record<Phase, string> = { now: "Teraz", beforeBirth: "Przed porodem", afterBirth: "Po porodzie", later: "Później" };

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  due?: string;
  phase: Phase;
  who: "mother" | "father" | "both";
  link?: string;
  critical?: boolean;
}

/** Postęp ciąży na podstawie terminu porodu (40 tygodni). */
export function pregnancyProgress(dueDate: string, today: string) {
  const daysLeft = diffDays(today, dueDate);
  const week = Math.min(42, Math.max(0, Math.floor((280 - daysLeft) / 7)));
  return { daysLeft, week, trimester: week < 14 ? 1 : week < 28 ? 2 : 3, born: daysLeft <= 0, percent: Math.min(100, Math.max(0, ((280 - daysLeft) / 280) * 100)) };
}

export function buildChecklist(input: CalcInput, result: CalcResult, today: string, params: Params = DEFAULT_PARAMS): ChecklistItem[] {
  const ev = input.eventDate;
  const isBirth = input.scenario === "birth";
  const items: ChecklistItem[] = [];
  const phaseOf = (due?: string): Phase => {
    if (!due) return "now";
    if (due <= addDays(today, 30)) return "now";
    if (due < ev) return "beforeBirth";
    if (due <= addDays(ev, 60)) return "afterBirth";
    return "later";
  };
  const push = (it: Omit<ChecklistItem, "phase"> & { phase?: Phase }) => items.push({ ...it, phase: it.phase ?? phaseOf(it.due) });

  // ubezpieczenie
  for (const [who, p] of [["mother", input.mother], ["father", input.father]] as const) {
    const name = who === "mother" ? "matki" : "ojca";
    if (p.title === "none") continue;
    push({ id: `ins-${who}`, who, title: `Sprawdź ubezpieczenie chorobowe ${name}`, description: "Zaloguj się do PUE/eZUS i potwierdź, że ubezpieczenie trwa i będzie trwać w dniu porodu.", link: "/pulpit", phase: "now", critical: true });
    if (p.title === "business") push({ id: `debt-${who}`, who, title: "Opłacaj składki w terminie, ureguluj zaległości", description: "Spóźniona składka = ustanie dobrowolnego ubezpieczenia chorobowego. Zadłużenie blokuje wypłatę zasiłku.", link: "/pulpit", phase: "now", critical: (p.contributionDebt ?? 0) > 0 });
    if (p.insuredUntil && p.insuredUntil < ev) push({ id: `until-${who}`, who, title: "Umowa kończy się przed porodem – zareaguj", description: "Bez ubezpieczenia w dniu porodu nie będzie zasiłku macierzyńskiego. Porozmawiaj o przedłużeniu lub zgłoś się do dobrowolnego ubezpieczenia (na zleceniu/działalności).", due: addDays(p.insuredUntil, -14), critical: true });
  }
  if (isBirth) {
    push({ id: "doc-due", who: "mother", title: "Zaświadczenie lekarskie o przewidywanej dacie porodu", description: "Potrzebne, jeśli chcesz zacząć urlop macierzyński przed porodem.", due: addDays(ev, -49), link: "/wnioski" });
    push({ id: "plan", who: "both", title: "Ustalcie podział urlopów", description: `Porównajcie warianty (100%+70% vs 81,5%, ${params.parentalNonTransferableWeeks} tyg. ojca, praca na część etatu).`, due: addDays(ev, -60), link: "/kalkulator" });
    push({ id: "bag", who: "both", title: "Przygotuj dokumenty do szpitala", description: "Dowód osobisty, karta ciąży, wyniki badań – a po porodzie karta urodzenia do USC.", due: addDays(ev, -21) });
  } else {
    push({ id: "court", who: "both", title: input.scenario === "adoption" ? "Zaświadczenie sądu o wszczęciu postępowania o przysposobienie" : "Postanowienie sądu / umowa o pełnienie funkcji rodziny zastępczej", description: "Podstawa wniosku o urlop na warunkach urlopu macierzyńskiego.", due: addDays(ev, -7), link: "/wnioski" });
  }
  for (const d of deadlines(input, result, params))
    push({ id: `dl-${d.date}-${d.title}`, who: d.who, title: d.title, description: d.description, due: d.date, critical: d.critical, link: d.title.startsWith("Wniosek") ? "/wnioski" : undefined });
  for (const doc of result.documents)
    push({ id: `doc-${doc.who}-${doc.name}`, who: doc.who, title: doc.name, description: `${doc.where} · ${doc.when}`, phase: isBirth ? "afterBirth" : "now", link: "/wnioski" });
  if (isBirth) push({ id: "pesel", who: "both", title: "Nadaj dziecku PESEL i zgłoś do ubezpieczenia zdrowotnego", description: "PESEL nadawany jest przy rejestracji urodzenia; zgłoś dziecko do ubezpieczenia zdrowotnego u pracodawcy lub w ZUS (ZCNA).", due: addDays(ev, 30) });

  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true))).sort((a, b) => (a.due ?? "0000").localeCompare(b.due ?? "0000"));
}

/** Kodowanie planu do linku (bez danych osobowych – tylko parametry kalkulatora). */
export function encodePlan(input: CalcInput): string {
  const json = JSON.stringify(input);
  const b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : (globalThis as any).Buffer.from(json, "utf8").toString("base64"); // eslint-disable-line @typescript-eslint/no-explicit-any
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodePlan(s: string): CalcInput | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : (globalThis as any).Buffer.from(b64, "base64").toString("utf8"); // eslint-disable-line @typescript-eslint/no-explicit-any
    const v = JSON.parse(json);
    return v && v.eventDate && v.mother && v.father ? (v as CalcInput) : null;
  } catch {
    return null;
  }
}

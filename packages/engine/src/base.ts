import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Podstawa wymiaru zasiłku (art. 36–38 ustawy zasiłkowej) – wersja dla pracownika:
// przeciętne miesięczne wynagrodzenie z 12 miesięcy kalendarzowych poprzedzających miesiąc powstania prawa,
// pomniejszone o składki na ubezpieczenia społeczne finansowane przez ubezpieczonego (13,71%).
// Miesiąc przepracowany częściowo (np. z powodu choroby) – wynagrodzenie się uzupełnia, jeśli przepracowano
// co najmniej połowę obowiązującego czasu pracy; w przeciwnym razie miesiąc się pomija.

export interface MonthWage {
  month: string; // RRRR-MM
  gross: number; // przychód stanowiący podstawę składek
  workedDays?: number; // dni przepracowane
  requiredDays?: number; // dni obowiązujące do przepracowania
}

export interface BaseStep {
  month: string;
  gross: number;
  counted: number;
  status: "full" | "supplemented" | "excluded";
  note: string;
}

export interface BaseResult {
  steps: BaseStep[];
  monthsCounted: number;
  average: number;
  contributions: number;
  base: number;
  daily: number;
  warnings: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function baseFromMonths(months: MonthWage[], params: Params = DEFAULT_PARAMS): BaseResult {
  const warnings: string[] = [];
  const steps: BaseStep[] = months.map((m) => {
    const req = m.requiredDays ?? 0;
    const wd = m.workedDays ?? req;
    if (!req || wd >= req) return { month: m.month, gross: m.gross, counted: m.gross, status: "full", note: "miesiąc przepracowany w pełni" };
    if (wd * 2 >= req) {
      const sup = r2((m.gross / wd) * req);
      return { month: m.month, gross: m.gross, counted: sup, status: "supplemented", note: `uzupełniono: ${m.gross.toFixed(2)} ÷ ${wd} dni × ${req} dni` };
    }
    return { month: m.month, gross: m.gross, counted: 0, status: "excluded", note: `pominięto – przepracowano ${wd} z ${req} dni (mniej niż połowa)` };
  });
  const used = steps.filter((s) => s.status !== "excluded");
  if (months.length < 12) warnings.push(`Podano ${months.length} mies. – przy krótszym ubezpieczeniu podstawę liczy się z pełnych miesięcy ubezpieczenia.`);
  if (!used.length) warnings.push("Brak miesięcy do uwzględnienia – podstawą będzie wynagrodzenie, które przysługiwałoby za pełny miesiąc.");
  const average = used.length ? r2(used.reduce((s, x) => s + x.counted, 0) / used.length) : 0;
  const contributions = r2(average * params.socialContributionEmployeeRate);
  const base = r2(average - contributions);
  const minBase = r2(params.minimumWage * (1 - params.socialContributionEmployeeRate));
  if (base && base < minBase) warnings.push(`Podstawa niższa niż minimalna dla pełnego etatu (${minBase.toFixed(2)} zł) – przy pełnym etacie ZUS przyjmie minimum.`);
  return { steps, monthsCounted: used.length, average, contributions, base, daily: r2(base / 30), warnings };
}

/** Szablon 12 miesięcy poprzedzających miesiąc zdarzenia. */
export function last12Months(eventDate: string, gross = 0): MonthWage[] {
  const d = new Date(eventDate + "T00:00:00Z");
  const out: MonthWage[] = [];
  for (let i = 12; i >= 1; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({ month: m.toISOString().slice(0, 7), gross, workedDays: 21, requiredDays: 21 });
  }
  return out;
}

/** Odczyt tabeli miesięcznych przychodów z tekstu Z-3 (wiersze typu "03.2026 7 250,00" lub "2026-03 7250.00"). */
export function monthsFromText(text: string): MonthWage[] {
  const out: MonthWage[] = [];
  const re = /\b(?:(\d{2})[.\/-](\d{4})|(\d{4})-(\d{2}))\b[^\d\n]{0,20}(\d{1,3}(?:[  ]?\d{3})*[,.]\d{2})(?:[^\d\n]{1,20}(\d{1,2})[^\d\n]{1,10}(\d{1,2}))?/g;
  for (const m of text.matchAll(re)) {
    const month = m[2] ? `${m[2]}-${m[1]}` : `${m[3]}-${m[4]}`;
    const gross = parseFloat(m[5].replace(/[  ]/g, "").replace(",", "."));
    if (gross > 0 && gross < 200000 && !out.some((x) => x.month === month)) out.push({ month, gross, workedDays: m[6] ? +m[6] : undefined, requiredDays: m[7] ? +m[7] : undefined });
  }
  return out.sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

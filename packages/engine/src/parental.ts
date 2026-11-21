import { addDays, calculate, totalBase, type CalcInput, type Notice, type Period, type Who } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Planer części urlopu rodzicielskiego (KP art. 182¹a–182¹e): podział między rodziców, części naprzemienne
// lub jednoczesne, łączenie z pracą – z walidacją limitów.

export interface ParentalPart {
  who: Who;
  start: string;
  weeks: number;
  workFraction?: number; // 0–0.5
}

export interface ParentalPlanResult {
  periods: Period[];
  errors: Notice[];
  warnings: Notice[];
  pool: number;
  used: { mother: number; father: number; total: number };
  parts: number;
  deadline: string;
  total: number;
  overlapDays: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtW = (n: number) => `${n} tyg.`;

/** Domyślny podział: mama po macierzyńskim, tata swoje 9 tygodni po mamie. */
export function defaultParentalParts(input: CalcInput, params: Params = DEFAULT_PARAMS): ParentalPart[] {
  const res = calculate(input, params);
  const afterMaternity = res.periods.filter((p) => p.type === "maternity" || p.type === "maternityFather" || p.type === "supplementary" || p.type === "adoptionMaternity").reduce((m, p) => (p.end > m ? p.end : m), input.eventDate);
  const start = addDays(afterMaternity, 1);
  const pool = res.limits.parentalWeeks;
  const nt = params.parentalNonTransferableWeeks;
  if (!res.mother.eligible && res.father.eligible) return [{ who: "father", start, weeks: pool }];
  if (res.mother.eligible && !res.father.eligible) return [{ who: "mother", start, weeks: pool }];
  return [
    { who: "mother", start, weeks: pool - nt },
    { who: "father", start: addDays(start, (pool - nt) * 7), weeks: nt },
  ];
}

export function planParental(input: CalcInput, parts: ParentalPart[], params: Params = DEFAULT_PARAMS): ParentalPlanResult {
  const res = calculate(input, params);
  const errors: Notice[] = [];
  const warnings: Notice[] = [];
  const pool = res.limits.parentalWeeks;
  const nt = params.parentalNonTransferableWeeks;
  const deadline = res.limits.parentalDeadline;
  const eligible = { mother: res.mother.eligible, father: res.father.eligible };
  const base = { mother: totalBase(input.mother, params), father: totalBase(input.father, params) };
  const oneApp = !!input.plan.oneApplication && eligible.mother;
  const name = (w: Who) => (w === "mother" ? "Mama" : "Tata");

  const sorted = [...parts].filter((p) => p.weeks > 0).sort((a, b) => a.start.localeCompare(b.start));
  const used = { mother: 0, father: 0, total: 0 };
  const periods: Period[] = [];

  sorted.forEach((p, i) => {
    const f = Math.min(Math.max(p.workFraction ?? 0, 0), 0.5);
    const days = Math.round((p.weeks * 7) / (1 - f));
    const rate = (p.who === "mother" && oneApp ? params.rates.oneApplication : params.rates.parental) * (1 - f);
    const monthly = r2(Math.max(base[p.who] * rate, base[p.who] > 0 ? params.minBenefitMonthly * (1 - f) : 0));
    const end = addDays(p.start, days - 1);
    used[p.who] += p.weeks;
    used.total += p.weeks;
    periods.push({ who: p.who, type: "parental", label: `Część ${i + 1}: rodzicielski – ${name(p.who).toLowerCase()}${f ? ` + praca ${Math.round(f * 100)}%` : ""}`, start: p.start, end, days, weeks: r2(days / 7), rate: r2(rate * 1000) / 1000, monthlyAmount: monthly, total: r2((monthly / 30) * days), note: f ? `${p.weeks} tyg. urlopu rozłożone na ${r2(days / 7)} tyg. pracy w niepełnym wymiarze` : undefined });
    if (!eligible[p.who]) errors.push({ level: "danger", title: `${name(p.who)}: brak prawa do zasiłku`, text: "Ta osoba nie podlega ubezpieczeniu chorobowemu – zasiłek za tę część nie przysługuje." });
    if (end > deadline) errors.push({ level: "danger", title: `Część ${i + 1} kończy się po terminie`, text: `Urlop rodzicielski trzeba wykorzystać do ${deadline} (koniec roku, w którym dziecko kończy 6 lat).` });
  });

  if (sorted.length > params.parentalMaxParts) errors.push({ level: "danger", title: `Za dużo części (${sorted.length})`, text: `Urlop rodzicielski można podzielić na najwyżej ${params.parentalMaxParts} części łącznie dla obojga rodziców (KP art. 182¹c).` });
  if (used.total > pool) errors.push({ level: "danger", title: `Przekroczona pula: ${fmtW(used.total)} z ${fmtW(pool)}`, text: "Rodzice korzystają z jednej wspólnej puli – także przy urlopie jednoczesnym (KP art. 182¹a § 6)." });
  for (const w of ["mother", "father"] as const) {
    const other = w === "mother" ? "father" : "mother";
    const max = eligible[other] ? pool - nt : pool;
    if (used[w] > max) errors.push({ level: "danger", title: `${name(w)}: maks. ${fmtW(max)}`, text: `${nt} tygodni należy wyłącznie do drugiego rodzica i nie można ich przejąć (KP art. 182¹a § 4).` });
    if (eligible[w] && eligible[other] && used[w] < nt) warnings.push({ level: "warning", title: `${name(w)}: ${fmtW(nt - used[w])} przepada`, text: `Każdemu rodzicowi przysługuje ${nt} tygodni na wyłączność – niewykorzystane przepadają.` });
  }
  const unused = pool - used.total;
  if (unused > 0 && used.total <= pool) warnings.push({ level: "info", title: `Niewykorzystane: ${fmtW(unused)}`, text: `Można je jeszcze zaplanować (do ${deadline}).` });

  // nakładanie się części tej samej osoby + dni wspólne obojga
  let overlapDays = 0;
  for (let i = 0; i < periods.length; i++)
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i], b = periods[j];
      const from = a.start > b.start ? a.start : b.start;
      const to = a.end < b.end ? a.end : b.end;
      if (from > to) continue;
      if (a.who === b.who) errors.push({ level: "danger", title: `${name(a.who)}: części nachodzą na siebie`, text: `${a.start}–${a.end} i ${b.start}–${b.end}.` });
      else overlapDays += Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
    }
  if (overlapDays) warnings.push({ level: "info", title: `Urlop jednoczesny: ${overlapDays} dni`, text: "Oboje rodzice są w tym czasie na urlopie – to dozwolone, ale dni obojga sumują się w puli." });

  const mat = res.periods.filter((p) => p.type !== "parental" && p.type !== "paternity");
  const matEnd = mat.reduce((m, p) => (p.end > m ? p.end : m), "");
  if (periods.some((p) => p.start <= matEnd && p.who === "mother")) errors.push({ level: "danger", title: "Rodzicielski mamy w trakcie macierzyńskiego", text: `Urlop rodzicielski zaczyna się po urlopie macierzyńskim (koniec: ${matEnd}).` });

  return { periods, errors, warnings, pool, used, parts: sorted.length, deadline, total: r2(periods.reduce((s, p) => s + p.total, 0)), overlapDays };
}

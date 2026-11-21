import { DEFAULT_PARAMS, type Params } from "./params.ts";
import { checkSecondTitle, type CalcInput, type CalcResult, type ParentInput } from "./calculator.ts";

export interface ExplainStep {
  label: string;
  /** Działanie, np. „7 100,00 zł × (1 − 13,71%)”. */
  formula?: string;
  value: string;
  legal?: string;
}
export interface ExplainSection {
  who: "mother" | "father";
  title: string;
  steps: ExplainStep[];
  total: number;
}

const zl = (n: number) => `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const pct = (r: number) => `${(Math.round(r * 10000) / 100).toLocaleString("pl-PL")}%`;
const TITLE = { employment: "umowa o pracę", mandate: "umowa zlecenia", business: "działalność gospodarcza", none: "brak tytułu ubezpieczenia" } as const;

/**
 * „Jak to policzyliśmy” – obliczenie krok po kroku dla każdego rodzica, z działaniami i podstawą prawną.
 * Odtwarza te same reguły co calculate(): podstawa = średni przychód − 13,71%, limit dla ubezpieczenia dobrowolnego,
 * drugi tytuł, kwota miesięczna = max(podstawa × stawka, minimum), kwota za okres = kwota miesięczna / 30 × dni.
 */
export function explainCalculation(input: CalcInput, r: CalcResult, params: Params = DEFAULT_PARAMS): ExplainSection[] {
  const out: ExplainSection[] = [];
  for (const who of ["mother", "father"] as const) {
    const p: ParentInput = input[who];
    const res = r[who];
    const periods = r.periods.filter((x) => x.who === who);
    if (p.title === "none" && !periods.length) continue;
    const steps: ExplainStep[] = [];
    steps.push({ label: "Tytuł ubezpieczenia", value: TITLE[p.title], legal: "art. 29 ustawy zasiłkowej" });
    if (!res.eligible) {
      steps.push({ label: "Prawo do zasiłku", value: "nie przysługuje", formula: res.reason });
      out.push({ who, title: who === "mother" ? "Mama" : "Tata", steps, total: 0 });
      continue;
    }
    const sicknessRate = params.socialContributionEmployeeRate;
    const employee = p.title === "employment";
    const baseLaw = employee ? "art. 36 ust. 1 w zw. z art. 47 ustawy zasiłkowej" : "art. 48 ust. 1 w zw. z art. 52 ustawy zasiłkowej";
    if (p.baseAlreadyNet) {
      steps.push({ label: "Podstawa z dokumentu (już po odliczeniu składek)", value: zl(p.monthlyBase), legal: baseLaw });
    } else {
      steps.push({ label: p.title === "business" ? "Zadeklarowana podstawa składek (średnia z 12 mies.)" : "Średni przychód brutto z 12 miesięcy", value: zl(p.monthlyBase), legal: baseLaw });
      steps.push({ label: "Odliczenie składek na ubezpieczenia społeczne", formula: `${zl(p.monthlyBase)} × (1 − ${pct(sicknessRate)})`, value: zl(p.monthlyBase * (1 - sicknessRate)), legal: employee ? "art. 3 pkt 3 ustawy zasiłkowej" : "art. 3 pkt 4 ustawy zasiłkowej" });
    }
    if (p.title === "business" || p.title === "mandate") {
      const cap = params.voluntaryBaseCapMonthly * (1 - sicknessRate);
      const raw = p.baseAlreadyNet ? p.monthlyBase : p.monthlyBase * (1 - sicknessRate);
      steps.push({ label: "Limit podstawy dobrowolnego ubezpieczenia chorobowego", formula: `${zl(params.voluntaryBaseCapMonthly)} × (1 − ${pct(sicknessRate)}) = ${zl(cap)}`, value: raw > cap ? "zastosowano – podstawa obniżona do limitu" : "nie przekroczono", legal: "art. 20 ust. 1 ustawy o systemie ubezpieczeń społecznych" });
    }
    if (p.secondTitle) {
      const c = checkSecondTitle(p, params);
      if (c) steps.push({ label: `Drugi tytuł: ${TITLE[p.secondTitle.title]}`, formula: c.reason, value: c.counts ? `+ ${zl(c.base)}` : "nie wlicza się" });
    }
    steps.push({ label: "Podstawa wymiaru zasiłku", value: zl(res.base) });
    steps.push({ label: "Stawka dzienna (100%)", formula: `${zl(res.base)} / 30`, value: zl(res.dailyBase), legal: "art. 36 ust. 3 ustawy zasiłkowej" });

    for (const x of periods) {
      const raw = res.base * x.rate;
      const minApplied = raw < params.minBenefitMonthly && res.base > 0;
      steps.push({
        label: `${x.label} (${x.start} – ${x.end})`,
        formula: `${minApplied ? `minimum ${zl(params.minBenefitMonthly)}` : `${zl(res.base)} × ${pct(x.rate)}`} = ${zl(x.monthlyAmount)}/mies.; ${zl(x.monthlyAmount)} / 30 × ${x.days} dni`,
        value: zl(x.total),
        legal: minApplied ? "art. 31 ust. 3a ustawy zasiłkowej" : "art. 31 ustawy zasiłkowej",
      });
    }
    const total = periods.reduce((a, x) => a + x.total, 0);
    steps.push({ label: "Razem", value: zl(total) });
    out.push({ who, title: who === "mother" ? "Mama" : "Tata", steps, total: Math.round(total * 100) / 100 });
  }
  return out;
}

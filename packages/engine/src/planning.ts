import { addDays, calculate, type CalcInput, type CalcResult } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// ---------- Terminy ----------
export interface Deadline {
  date: string;
  title: string;
  who: "mother" | "father" | "both";
  critical: boolean;
  description: string;
}

export function deadlines(input: CalcInput, result: CalcResult, params: Params = DEFAULT_PARAMS): Deadline[] {
  const out: Deadline[] = [];
  const ev = input.eventDate;
  const isBirth = input.scenario === "birth";
  const mat = result.periods.find((p) => p.type === "maternity");
  if (isBirth && mat && mat.start < ev)
    out.push({ date: addDays(mat.start, -1), who: "mother", critical: false, title: "Wniosek o urlop macierzyński przed porodem", description: "Złóż wniosek z zaświadczeniem lekarskim o przewidywanej dacie porodu." });
  if (isBirth) {
    out.push({ date: addDays(ev, 14), who: "both", critical: false, title: "Rejestracja urodzenia dziecka (USC)", description: "Zgłoś urodzenie w ciągu 21 dni; zamów skrócony odpis aktu urodzenia." });
    if (result.mother.eligible)
      out.push({ date: addDays(ev, params.oneApplicationDeadlineDays), who: "mother", critical: true, title: "Ostatni dzień na wniosek o 81,5%", description: "Jeden wniosek o macierzyński + rodzicielski. Po tym terminie: 100% + 70%." });
  }
  for (const p of result.periods) {
    if (p.type === "parental" || p.type === "maternityFather")
      out.push({ date: addDays(p.start, -21), who: p.who, critical: true, title: `Wniosek: ${p.label.toLowerCase()}`, description: `Złóż min. 21 dni przed rozpoczęciem (${p.start}).` });
  }
  const paternity = result.periods.find((p) => p.type === "paternity");
  if (paternity || (isBirth && result.father.eligible && !input.stillbirth))
    out.push({ date: addDays(ev, 364), who: "father", critical: true, title: "Koniec terminu na urlop ojcowski", description: "Urlop ojcowski (14 dni) wygasa, gdy dziecko kończy 12 miesięcy." });
  if (result.limits.parentalWeeks > 0)
    out.push({ date: result.limits.parentalDeadline, who: "both", critical: false, title: "Koniec terminu na urlop rodzicielski", description: "Niewykorzystana część urlopu rodzicielskiego przepada." });
  if ((input.mother.contributionDebt ?? 0) > 0 || (input.father.contributionDebt ?? 0) > 0)
    out.push({ date: addDays(ev, -30), who: input.mother.contributionDebt ? "mother" : "father", critical: true, title: "Spłać zadłużenie składkowe", description: "Zasiłek nie zostanie wypłacony do czasu spłaty." });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function toICS(items: Deadline[]): string {
  const d = (s: string) => s.replace(/-/g, "");
  const esc = (s: string) => s.replace(/[,;\\]/g, (m) => "\\" + m);
  const ev = items.map((x, i) =>
    ["BEGIN:VEVENT", `UID:zpr-${i}-${d(x.date)}@przewodnik-rodzica`, `DTSTAMP:${d(x.date)}T080000Z`, `DTSTART;VALUE=DATE:${d(x.date)}`, `SUMMARY:${esc(x.title)}`, `DESCRIPTION:${esc(x.description)}`, "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", `DESCRIPTION:${esc(x.title)}`, "END:VALARM", "END:VEVENT"].join("\r\n"),
  );
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Przewodnik Rodzica//PL", ...ev, "END:VCALENDAR"].join("\r\n");
}

// ---------- Porównanie wariantów ----------
export interface Variant {
  id: string;
  name: string;
  description: string;
  input: CalcInput;
  result: CalcResult;
  totalWeeks: number;
  avgMonthly: number;
}

export function compareVariants(base: CalcInput, params: Params = DEFAULT_PARAMS): { variants: Variant[]; recommendation: string } {
  const mk = (id: string, name: string, description: string, plan: Partial<CalcInput["plan"]>): Variant => {
    const input = { ...base, plan: { ...base.plan, ...plan } };
    const result = calculate(input, params);
    const days = result.periods.reduce((s, p) => s + p.days, 0);
    return { id, name, description, input, result, totalWeeks: Math.round(days / 7), avgMonthly: days ? Math.round((result.total / days) * 30) : 0 };
  };
  const par = calculate(base, params).limits.parentalWeeks;
  const nt = params.parentalNonTransferableWeeks;
  const v: Variant[] = [];
  v.push(mk("standard", "100% + 70%", "Macierzyński 100%, rodzicielski 70%. Ojciec bierze swoje 9 tyg.", { oneApplication: false, motherParentalWeeks: par - nt, fatherParentalWeeks: nt, workFraction: undefined }));
  v.push(mk("one", "81,5% za cały okres", "Jeden wniosek do 21 dni po porodzie – równa kwota co miesiąc.", { oneApplication: true, motherParentalWeeks: par - nt, fatherParentalWeeks: nt, workFraction: undefined }));
  v.push(mk("motherOnly", "Tylko matka", "Ojciec nie korzysta z rodzicielskiego – 9 tyg. przepada.", { oneApplication: false, motherParentalWeeks: par - nt, fatherParentalWeeks: 0, workFraction: undefined }));
  v.push(mk("work", "Matka wraca na 1/2 etatu", "Rodzicielski łączony z pracą – dłuższa opieka, zasiłek + pensja.", { oneApplication: false, motherParentalWeeks: par - nt, fatherParentalWeeks: nt, workFraction: { who: "mother", fraction: 0.5 } }));
  const valid = v.filter((x) => x.result.total > 0);
  let recommendation = "Brak prawa do zasiłku macierzyńskiego w żadnym wariancie – sprawdź ubezpieczenie chorobowe.";
  if (valid.length) {
    const best = valid.reduce((a, b) => (b.result.total > a.result.total ? b : a));
    const std = v[0].result.total;
    const one = v[1].result.total;
    recommendation = `Najwyższa łączna kwota: „${best.name}” (${Math.round(best.result.total).toLocaleString("pl-PL")} zł). `;
    recommendation += one > std ? "Przy pełnym wykorzystaniu urlopu 81,5% daje więcej i stały dochód." : "100% + 70% daje więcej lub tyle samo – 81,5% opłaca się głównie dla stabilności wypłat.";
    if (v[2].result.total < std) recommendation += ` Wykorzystanie 9 tygodni przez ojca to +${Math.round(std - v[2].result.total).toLocaleString("pl-PL")} zł dla rodziny.`;
  }
  return { variants: v, recommendation };
}

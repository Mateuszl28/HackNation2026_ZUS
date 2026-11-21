import { calculate, type CalcInput, type CalcResult, type InsuranceTitle } from "./calculator.ts";
import { parseDocumentText, type ParsedDocument } from "./parser.ts";
import { baseFromMonths, monthsFromText } from "./base.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Analiza zestawu dokumentów jednej sprawy (Z-3, ZAM, poświadczenie ubezpieczenia, zrzut z systemu, e-ZLA):
// profil ubezpieczonego → werdykt + wyliczenie → porównanie z rozstrzygnięciem ZUS zapisanym w zestawie.

export interface DossierDoc { name: string; text: string }

export interface DossierProfile {
  docs: (ParsedDocument & { name: string; outcome?: "granted" | "refused"; codeB?: boolean; periods: { from: string; to?: string }[] })[];
  title?: InsuranceTitle;
  eventDate?: string;
  monthlyBase?: number;
  baseSource?: string;
  baseIsNet: boolean;
  insuredSince?: string;
  insuredUntil?: string;
  periods: { from: string; to?: string; source: string }[];
  insuredOnEvent: boolean | null;
  insuredReason: string;
  codeB: boolean;
  children: number;
  zusOutcome: "granted" | "refused" | null;
  zusOutcomeSource?: string;
  input: CalcInput | null;
  result: CalcResult | null;
  verdict: "granted" | "refused" | "unknown";
  agreement: boolean | null;
  missing: string[];
}

const DATE = String.raw`(\d{2}[.\-/]\d{2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})`;
const iso = (d: string) => {
  const m = d.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d.slice(0, 10);
};

function extra(text: string) {
  const t = text.replace(/ /g, " ");
  let outcome: "granted" | "refused" | undefined;
  if (/odmow\w*|odmawia\w*|nie\s+przys[łl]ugu\w*\s+(prawo\s+do\s+)?zasi[łl]/i.test(t)) outcome = "refused";
  else if (/przyzna(no|je|ł|ła)\b|przyznanie\s+prawa|wyp[łl]acono\s+zasi[łl]|ustalono\s+prawo/i.test(t)) outcome = "granted";
  const codeB = /kod\w*\s*(literow\w*)?\s*[:\-–]?\s*["„]?B["”]?(?![A-Za-z])/i.test(t) || /\bkod\s+B\b/i.test(t);
  const periods: { from: string; to?: string }[] = [];
  for (const m of t.matchAll(new RegExp(String.raw`od\s*(?:dnia\s*)?${DATE}\s*(?:r\.?)?\s*do\s*(?:dnia\s*)?(${DATE.slice(1, -1)}|nadal|obecnie|chwili\s+obecnej)`, "gi"))) {
    periods.push({ from: iso(m[1]), to: /\d/.test(m[2]) ? iso(m[2]) : undefined });
  }
  const kids = t.match(/liczb\w*\s+dzieci[^\d]{0,15}(\d)/i);
  return { outcome, codeB, periods, children: kids ? +kids[1] : 0 };
}

const TITLE_PRIORITY: InsuranceTitle[] = ["employment", "mandate", "business"];

export function analyzeDossier(files: DossierDoc[], params: Params = DEFAULT_PARAMS): DossierProfile {
  const docs = files.map((f) => {
    const p = parseDocumentText(f.text);
    return { ...p, name: f.name, ...extra(f.text) };
  });
  const missing: string[] = [];

  const titles = docs.map((d) => d.title).filter(Boolean) as InsuranceTitle[];
  const title = TITLE_PRIORITY.find((t) => titles.includes(t));
  const eventDate = docs.map((d) => d.eventDate).find(Boolean);

  // podstawa: najpierw tabela miesięcy (Z-3), potem kwota z dokumentu
  let monthlyBase: number | undefined;
  let baseSource: string | undefined;
  let baseIsNet = false;
  for (const f of files) {
    const months = monthsFromText(f.text);
    if (months.length >= 3) {
      monthlyBase = baseFromMonths(months, params).base;
      baseSource = `${f.name}: średnia z ${months.length} mies. po odliczeniu 13,71%`;
      baseIsNet = true;
      break;
    }
  }
  if (monthlyBase === undefined) {
    const d = docs.find((x) => x.monthlyBase);
    if (d) {
      monthlyBase = d.monthlyBase;
      baseSource = `${d.name}: kwota z dokumentu`;
    }
  }

  const periods = docs.flatMap((d) => d.periods.map((p) => ({ ...p, source: d.name })));
  const insuredSince = [...docs.map((d) => d.insuredSince), ...periods.map((p) => p.from)].filter(Boolean).sort()[0];
  const ends = periods.filter((p) => p.to).map((p) => p.to!);
  const openEnded = periods.some((p) => !p.to);
  const insuredUntil = !openEnded && ends.length ? ends.sort().at(-1) : docs.map((d) => d.insuredUntil).find(Boolean);

  let insuredOnEvent: boolean | null = null;
  let insuredReason = "Brak danych o ubezpieczeniu chorobowym w dokumentach.";
  const explicitNo = docs.find((d) => d.insured === false);
  if (explicitNo) {
    insuredOnEvent = false;
    insuredReason = `${explicitNo.name}: dokument wskazuje brak ubezpieczenia chorobowego.`;
  } else if (eventDate && periods.length) {
    const cover = periods.find((p) => p.from <= eventDate && (!p.to || p.to >= eventDate));
    insuredOnEvent = !!cover;
    insuredReason = cover ? `Okres ubezpieczenia ${cover.from} – ${cover.to ?? "nadal"} (${cover.source}) obejmuje dzień porodu ${eventDate}.` : `Żaden okres ubezpieczenia z dokumentów nie obejmuje dnia porodu ${eventDate}.`;
  } else if (docs.some((d) => d.insured === true)) {
    insuredOnEvent = true;
    insuredReason = `${docs.find((d) => d.insured)!.name}: dokument potwierdza ubezpieczenie chorobowe.`;
  }

  if (!title) missing.push("tytuł ubezpieczenia (np. Z-3, Z-3a, ZAS-53, poświadczenie)");
  if (!eventDate) missing.push("data porodu / przyjęcia dziecka");
  if (monthlyBase === undefined) missing.push("kwota podstawy / wynagrodzenia");

  const zusDoc = docs.find((d) => d.outcome);
  const zusOutcome = zusDoc?.outcome ?? null;

  let input: CalcInput | null = null;
  let result: CalcResult | null = null;
  if (eventDate) {
    input = {
      scenario: "birth",
      eventDate,
      children: Math.max(1, ...docs.map((d) => d.children)),
      mother: insuredOnEvent === false || !title ? { title: "none", monthlyBase: 0 } : { title, monthlyBase: monthlyBase ?? params.minimumWage, baseAlreadyNet: baseIsNet, insuredSince, insuredUntil },
      father: { title: "none", monthlyBase: 0 },
      plan: {},
    };
    result = calculate(input, params);
  }
  const verdict: DossierProfile["verdict"] = insuredOnEvent === false ? "refused" : insuredOnEvent === true && result?.mother.eligible ? "granted" : "unknown";
  return {
    docs,
    title,
    eventDate,
    monthlyBase,
    baseSource,
    baseIsNet,
    insuredSince,
    insuredUntil,
    periods,
    insuredOnEvent,
    insuredReason,
    codeB: docs.some((d) => d.codeB),
    children: Math.max(1, ...docs.map((d) => d.children)),
    zusOutcome,
    zusOutcomeSource: zusDoc?.name,
    input,
    result,
    verdict,
    agreement: zusOutcome && verdict !== "unknown" ? zusOutcome === verdict : null,
    missing,
  };
}

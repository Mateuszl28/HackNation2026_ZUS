import type { InsuranceTitle } from "./calculator.ts";

export interface ParsedDocument {
  formType: string;
  fields: { label: string; value: string }[];
  title?: InsuranceTitle;
  monthlyBase?: number;
  insuredSince?: string;
  insuredUntil?: string;
  eventDate?: string;
  insured: boolean | null;
  confidence: number;
  warnings: string[];
}

/** Usuwa polskie znaki diakrytyczne – dopasowanie odporne na utracone ogonki (fonty PDF, skany, OCR). */
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L");

const FORMS: [RegExp, string, InsuranceTitle | undefined][] = [
  [/\bZ-3a\b/i, "Z-3a – zaświadczenie płatnika (zleceniobiorca)", "mandate"],
  [/\bZ-3b\b/i, "Z-3b – zaświadczenie (działalność)", "business"],
  [/\bZ-3\b/i, "Z-3 – zaświadczenie płatnika (pracownik)", "employment"],
  [/\bZAS-53\b/i, "ZAS-53 – wniosek o zasiłek chorobowy", "business"],
  [/\bZAS-12\b/i, "ZAS-12 – zaświadczenie płatnika na dalszy okres", undefined],
  [/\bZAM\b/, "ZAM – wniosek o zasiłek macierzyński", undefined],
  [/\bZUR\b/, "ZUR – wniosek (rodzicielski) – zlikwidowany 24.10.2026, zastąpiony ZAM", undefined],
  [/\bZAO\b/, "ZAO – wniosek (ojcowski) – zlikwidowany 24.10.2026, zastąpiony ZAM", undefined],
  [/poswiadczenie\s+ubezpieczenia/i, "Poświadczenie ubezpieczenia chorobowego", undefined],
  [/e-?ZLA/i, "e-ZLA – zaświadczenie lekarskie", undefined],
];

const toIso = (d: string) => {
  const m = d.match(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m2 ? m2[0] : undefined;
};
const toNum = (s: string) => parseFloat(s.replace(/\s/g, "").replace(",", "."));

/** Heurystyczna ekstrakcja danych z tekstu dokumentu ZUS (PDF → tekst). */
export function parseDocumentText(text: string): ParsedDocument {
  const t = fold(text.replace(/ /g, " "));
  const warnings: string[] = [];
  const fields: ParsedDocument["fields"] = [];
  let formType = "Nieznany dokument";
  let title: InsuranceTitle | undefined;
  for (const [re, name, tt] of FORMS)
    if (re.test(t)) {
      formType = name;
      title = tt;
      break;
    }
  if (/umow[aye] o prace/i.test(t)) title ??= "employment";
  if (/umow[ayę] zlecenia/i.test(t)) title ??= "mandate";
  if (/dzialalnosci? gospodarcz/i.test(t)) title ??= "business";

  const pesel = t.match(/\b\d{11}\b/);
  if (pesel) fields.push({ label: "PESEL", value: pesel[0].slice(0, 4) + "*******" });

  const dates = [...t.matchAll(/\b(\d{2}[.\-/]\d{2}[.\-/]\d{4}|\d{4}-\d{2}-\d{2})\b/g)].map((m) => toIso(m[1])!).filter(Boolean);

  // data przy etykiecie: najpierw w tej samej linii (pola formularza „Etykieta: wartość”), potem do 80 znaków dalej (tabele)
  const near = (re: RegExp) => {
    const D = "(\\d{2}[.\\-/]\\d{2}[.\\-/]\\d{4}|\\d{4}-\\d{2}-\\d{2})";
    const m = t.match(new RegExp(re.source + "[^\\d\\n]{0,80}" + D, "i")) ?? t.match(new RegExp(re.source + "[^\\d]{0,80}" + D, "i"));
    return m ? toIso(m[1]) : undefined;
  };
  const eventDate = near(/(?:dat[ay] (?:urodzenia|porodu)|porod|urodzeni[ae] dziecka|przewidywan\w* dat\w* porodu)/);
  const insuredSince = near(/(?:od dnia|zatrudnion\w* od|podlega\w*[^.]{0,40}od|data (?:zgloszenia|rozpoczecia))/);
  const insuredUntil = near(/(?:do dnia|ustani\w*|rozwiazani\w*|zakonczeni\w*)/);

  // kwoty – szukamy "podstaw"/"wynagrodzeni"/"przeciętn"
  const amounts = [...t.matchAll(/(?:podstaw\w*|wynagrodzeni\w*|przecietn\w*|przychod)[^\d]{0,60}(\d{1,3}(?:[  ]?\d{3})*[,.]\d{2})/gi)].map((m) => toNum(m[1]));
  const monthlyBase = amounts.length ? Math.max(...amounts.filter((a) => a < 100000)) : undefined;

  let insured: boolean | null = null;
  if (/nie\s+podlega\w*\s+ubezpieczeni\w*\s+chorobow/i.test(t) || /brak\s+ubezpieczenia/i.test(t)) insured = false;
  else if (/podlega\w*\s+ubezpieczeni\w*\s+chorobow/i.test(t) || /ubezpieczenie chorobowe[:\s]+(tak|obowiazkowe|dobrowolne)/i.test(t)) insured = true;

  if (eventDate) fields.push({ label: "Data porodu / zdarzenia", value: eventDate });
  if (insuredSince) fields.push({ label: "Ubezpieczenie od", value: insuredSince });
  if (insuredUntil) fields.push({ label: "Ubezpieczenie do", value: insuredUntil });
  if (monthlyBase) fields.push({ label: "Kwota podstawy / wynagrodzenia", value: monthlyBase.toFixed(2) + " zł" });
  if (insured !== null) fields.push({ label: "Ubezpieczenie chorobowe", value: insured ? "TAK" : "NIE" });
  if (dates.length && !eventDate) fields.push({ label: "Daty w dokumencie", value: [...new Set(dates)].slice(0, 6).join(", ") });

  if (/ZUR|ZAO/.test(formType)) warnings.push("Ten formularz od 24.10.2026 został połączony z ZAM – złóż ZAM.");
  if (!monthlyBase) warnings.push("Nie odczytano kwoty podstawy – uzupełnij ręcznie.");
  if (insured === null) warnings.push("Nie ustalono jednoznacznie statusu ubezpieczenia chorobowego.");

  const confidence = Math.min(1, (formType !== "Nieznany dokument" ? 0.3 : 0) + (monthlyBase ? 0.25 : 0) + (insured !== null ? 0.25 : 0) + (eventDate || insuredSince ? 0.2 : 0));
  return { formType, fields, title, monthlyBase, insuredSince, insuredUntil, eventDate, insured, confidence, warnings };
}

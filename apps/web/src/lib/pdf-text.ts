import { extractText, getDocumentProxy } from "unpdf";

/**
 * Tekst z PDF: warstwa tekstowa stron + wartości pól formularza (AcroForm).
 * Formularze ZUS (Z-3, ZAM…) to interaktywne PDF – wpisane wartości są w polach, nie w tekście strony.
 * Każde wypełnione pole dopisujemy jako „Opis pola: wartość” (opis z TU/alternativeText albo nazwa pola),
 * żeby parser mógł je rozpoznać po słowach kluczowych.
 */
export async function pdfToText(buf: Uint8Array): Promise<{ text: string; formFields: number }> {
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annots = (await page.getAnnotations({ intent: "display" })) as { subtype?: string; fieldName?: string; fieldValue?: unknown; alternativeText?: string; checkBox?: boolean; buttonValue?: string }[];
    for (const a of annots) {
      if (a.subtype !== "Widget") continue;
      let v = a.fieldValue;
      if (a.checkBox) v = v && v !== "Off" ? "TAK" : "";
      if (Array.isArray(v)) v = v.join(", ");
      if (v === undefined || v === null || String(v).trim() === "" || v === "Off") continue;
      const label = (a.alternativeText || a.fieldName || "pole").replace(/\s+/g, " ").trim();
      lines.push(`${label}: ${String(v).trim()}`);
    }
  }
  return { text: [text as string, ...lines].join("\n"), formFields: lines.length };
}

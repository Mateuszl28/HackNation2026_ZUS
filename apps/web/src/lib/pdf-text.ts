import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";
import { isImage, ocrImage } from "@/lib/ocr";

const MAX_OCR_PAGES = 3;

/**
 * Tekst z PDF: warstwa tekstowa stron + wartości pól formularza (AcroForm).
 * Formularze ZUS (Z-3, ZAM…) to interaktywne PDF – wpisane wartości są w polach, nie w tekście strony.
 * Każde wypełnione pole dopisujemy jako „Opis pola: wartość” (opis z TU/alternativeText albo nazwa pola),
 * żeby parser mógł je rozpoznać po słowach kluczowych.
 * Skan bez warstwy tekstowej → OCR pierwszych stron (render do obrazu + Tesseract, język polski).
 */
export async function pdfToText(buf: Uint8Array): Promise<{ text: string; formFields: number; ocr?: { pages: number; confidence: number } }> {
  const pdf = await getDocumentProxy(buf.slice());
  const { text } = await extractText(pdf, { mergePages: true });
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annots = (await page.getAnnotations({ intent: "display" })) as { subtype?: string; fieldName?: string; fieldValue?: unknown; alternativeText?: string; checkBox?: boolean }[];
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
  const textLayer = String(text ?? "");
  if (textLayer.replace(/\s/g, "").length >= 30 || lines.length) return { text: [textLayer, ...lines].join("\n"), formFields: lines.length };

  // skan – OCR
  const pages = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const parts: string[] = [];
  let conf = 0;
  for (let i = 1; i <= pages; i++) {
    const png = await renderPageAsImage(buf.slice(), i, { canvasImport: () => import("@napi-rs/canvas"), scale: 2.5 });
    const r = await ocrImage(png);
    parts.push(r.text);
    conf += r.confidence;
  }
  return { text: parts.join("\n"), formFields: 0, ocr: { pages, confidence: Math.round(conf / Math.max(1, pages)) } };
}

/** Dowolny plik → tekst: PDF (tekst/formularz/OCR), zdjęcie (OCR), plik tekstowy. */
export async function fileToText(name: string, buf: Uint8Array) {
  if (name.toLowerCase().endsWith(".pdf")) return pdfToText(buf);
  if (isImage(name)) {
    const r = await ocrImage(buf);
    return { text: r.text, formFields: 0, ocr: { pages: 1, confidence: r.confidence } };
  }
  return { text: new TextDecoder().decode(buf), formFields: 0 };
}

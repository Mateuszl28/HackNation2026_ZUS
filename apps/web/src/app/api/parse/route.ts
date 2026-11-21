import { baseFromMonths, monthsFromText, parseDocumentText } from "@zus/engine";
import { fileToText } from "@/lib/pdf-text";

/** POST /api/parse – multipart (file: PDF) lub JSON { text } → odczytane dane dokumentu ZUS. Plik nie jest zapisywany. */
export async function POST(req: Request) {
  try {
    let text = "";
    let formFields = 0;
    let ocr: { pages: number; confidence: number } | undefined;
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ error: "Brak pliku" }, { status: 400 });
      if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Plik > 8 MB" }, { status: 413 });
      const buf = new Uint8Array(await file.arrayBuffer());
      const out = await fileToText(file.name, buf);
      text = out.text;
      formFields = out.formFields;
      ocr = out.ocr;
    } else {
      text = (await req.json()).text ?? "";
    }
    const parsed = parseDocumentText(text);
    if (ocr) parsed.warnings.unshift(`Tekst rozpoznany przez OCR (${ocr.pages} str., pewność ${ocr.confidence}%) – sprawdź odczytane wartości.`);
    if (text.trim().length < 20) parsed.warnings.unshift("Nie udało się odczytać tekstu – wprowadź dane ręcznie.");
    const months = monthsFromText(text);
    const base = months.length >= 3 ? baseFromMonths(months) : null;
    if (base) parsed.fields.push({ label: `Podstawa z ${base.monthsCounted} mies. (po 13,71%)`, value: base.base.toFixed(2) + " zł" });
    if (formFields) parsed.fields.push({ label: "Pola formularza PDF", value: String(formFields) });
    return Response.json({ ...parsed, months, computedBase: base?.base ?? null, formFields, ocr, textPreview: text.slice(0, 600) });
  } catch (e) {
    return Response.json({ error: "Nie udało się odczytać dokumentu: " + String(e) }, { status: 400 });
  }
}

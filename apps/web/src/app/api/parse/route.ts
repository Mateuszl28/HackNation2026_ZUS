import { baseFromMonths, monthsFromText, parseDocumentText } from "@zus/engine";
import { pdfToText } from "@/lib/pdf-text";

/** POST /api/parse – multipart (file: PDF) lub JSON { text } → odczytane dane dokumentu ZUS. Plik nie jest zapisywany. */
export async function POST(req: Request) {
  try {
    let text = "";
    let formFields = 0;
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ error: "Brak pliku" }, { status: 400 });
      if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Plik > 4 MB" }, { status: 413 });
      const buf = new Uint8Array(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const out = await pdfToText(buf);
        text = out.text;
        formFields = out.formFields;
      } else text = new TextDecoder().decode(buf);
    } else {
      text = (await req.json()).text ?? "";
    }
    const parsed = parseDocumentText(text);
    if (text.trim().length < 20) parsed.warnings.unshift("Dokument nie zawiera warstwy tekstowej (skan) – wprowadź dane ręcznie.");
    const months = monthsFromText(text);
    const base = months.length >= 3 ? baseFromMonths(months) : null;
    if (base) parsed.fields.push({ label: `Podstawa z ${base.monthsCounted} mies. (po 13,71%)`, value: base.base.toFixed(2) + " zł" });
    if (formFields) parsed.fields.push({ label: "Pola formularza PDF", value: String(formFields) });
    return Response.json({ ...parsed, months, computedBase: base?.base ?? null, formFields, textPreview: text.slice(0, 600) });
  } catch (e) {
    return Response.json({ error: "Nie udało się odczytać dokumentu: " + String(e) }, { status: 400 });
  }
}

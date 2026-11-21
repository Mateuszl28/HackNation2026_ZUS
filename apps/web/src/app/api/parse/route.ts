import { parseDocumentText } from "@zus/engine";
import { extractText, getDocumentProxy } from "unpdf";

/** POST /api/parse – multipart (file: PDF) lub JSON { text } → odczytane dane dokumentu ZUS. Plik nie jest zapisywany. */
export async function POST(req: Request) {
  try {
    let text = "";
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ error: "Brak pliku" }, { status: 400 });
      if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Plik > 4 MB" }, { status: 413 });
      const buf = new Uint8Array(await file.arrayBuffer());
      if (file.name.toLowerCase().endsWith(".pdf")) {
        const pdf = await getDocumentProxy(buf);
        const out = await extractText(pdf, { mergePages: true });
        text = out.text as string;
      } else text = new TextDecoder().decode(buf);
    } else {
      text = (await req.json()).text ?? "";
    }
    const parsed = parseDocumentText(text);
    if (text.trim().length < 20) parsed.warnings.unshift("Dokument nie zawiera warstwy tekstowej (skan) – wprowadź dane ręcznie.");
    return Response.json({ ...parsed, textPreview: text.slice(0, 600) });
  } catch (e) {
    return Response.json({ error: "Nie udało się odczytać dokumentu: " + String(e) }, { status: 400 });
  }
}

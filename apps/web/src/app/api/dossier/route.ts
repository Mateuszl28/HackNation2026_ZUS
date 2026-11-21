import { analyzeDossier } from "@zus/engine";
import { fileToText } from "@/lib/pdf-text";
import { getConfig } from "@/lib/params-store";

/** POST multipart (wiele plików `files`) – analiza zestawu dokumentów jednej sprawy. Pliki nie są zapisywane. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 15);
    if (!files.length) return Response.json({ error: "Dodaj co najmniej jeden plik" }, { status: 400 });
    const docs: { name: string; text: string }[] = [];
    const scans: string[] = [];
    const ocrUsed: string[] = [];
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) return Response.json({ error: `Plik ${f.name} > 8 MB` }, { status: 413 });
      const buf = new Uint8Array(await f.arrayBuffer());
      const out = await fileToText(f.name, buf);
      const text = out.text;
      if (out.ocr) ocrUsed.push(`${f.name} (OCR ${out.ocr.confidence}%)`);
      if (text.trim().length < 20) scans.push(f.name);
      docs.push({ name: f.name, text });
    }
    const { params } = await getConfig();
    const profile = analyzeDossier(docs, params);
    return Response.json({ ...profile, scans, ocrUsed });
  } catch (e) {
    return Response.json({ error: "Nie udało się przeanalizować dokumentów: " + String(e) }, { status: 400 });
  }
}

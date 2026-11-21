import { analyzeDossier } from "@zus/engine";
import { pdfToText } from "@/lib/pdf-text";
import { getConfig } from "@/lib/params-store";

/** POST multipart (wiele plików `files`) – analiza zestawu dokumentów jednej sprawy. Pliki nie są zapisywane. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 15);
    if (!files.length) return Response.json({ error: "Dodaj co najmniej jeden plik" }, { status: 400 });
    const docs: { name: string; text: string }[] = [];
    const scans: string[] = [];
    for (const f of files) {
      if (f.size > 4 * 1024 * 1024) return Response.json({ error: `Plik ${f.name} > 4 MB` }, { status: 413 });
      const buf = new Uint8Array(await f.arrayBuffer());
      let text = "";
      if (f.name.toLowerCase().endsWith(".pdf")) text = (await pdfToText(buf)).text;
      else text = new TextDecoder().decode(buf);
      if (text.trim().length < 20) scans.push(f.name);
      docs.push({ name: f.name, text });
    }
    const { params } = await getConfig();
    const profile = analyzeDossier(docs, params);
    return Response.json({ ...profile, scans });
  } catch (e) {
    return Response.json({ error: "Nie udało się przeanalizować dokumentów: " + String(e) }, { status: 400 });
  }
}

import { unzipSync } from "fflate";
import { analyzeDossier } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { getConfig } from "@/lib/params-store";
import { fileToText } from "@/lib/pdf-text";

export const maxDuration = 300;

const MAX_TOTAL = 80 * 1024 * 1024;
const MAX_FILES = 300;
const OK_EXT = /\.(pdf|txt|jpe?g|png|webp)$/i;

/**
 * Zbiorcza weryfikacja spraw (panel urzędnika): pliki pogrupowane w sprawy po pierwszym segmencie ścieżki
 * („sprawa-01/z3.pdf”) albo po archiwum ZIP (jedno archiwum = jedna sprawa, lub podfoldery w archiwum = sprawy).
 * Dla każdej sprawy: analiza zestawu (ubezpieczenie w dniu porodu, wyliczenie) i porównanie z rozstrzygnięciem ZUS.
 */
export async function POST(req: Request) {
  if (!(await adminFromRequest(req))) return unauthorized();
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    const total = files.reduce((s, f) => s + f.size, 0);
    if (!files.length) return Response.json({ error: "Dodaj folder ze sprawami lub archiwa ZIP" }, { status: 400 });
    if (total > MAX_TOTAL) return Response.json({ error: "Łączny rozmiar > 80 MB" }, { status: 413 });

    const groups = new Map<string, { name: string; buf: Uint8Array }[]>();
    const add = (path: string, buf: Uint8Array, fallback: string) => {
      const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
      const name = parts.at(-1) ?? path;
      if (!OK_EXT.test(name) || name.startsWith(".") || parts.includes("__MACOSX")) return;
      // folder główny wspólny dla wszystkich (wybór katalogu w przeglądarce) pomijamy
      const key = parts.length >= 2 ? parts[parts.length - 2] : fallback;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ name, buf });
    };

    for (const f of files) {
      const buf = new Uint8Array(await f.arrayBuffer());
      if (/\.zip$/i.test(f.name)) {
        const zipName = f.name.replace(/\.zip$/i, "").split("/").pop()!;
        for (const [p, data] of Object.entries(unzipSync(buf))) if (data.length) add(p.includes("/") ? p : `${zipName}/${p}`, data, zipName);
      } else add(f.name, buf, "sprawa");
    }
    const count = [...groups.values()].reduce((s, g) => s + g.length, 0);
    if (!count) return Response.json({ error: "Nie znaleziono plików PDF / TXT / zdjęć" }, { status: 400 });
    if (count > MAX_FILES) return Response.json({ error: `Za dużo plików (${count} > ${MAX_FILES})` }, { status: 413 });

    const { params } = await getConfig();
    const rows = [];
    for (const [caseName, docs] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "pl", { numeric: true }))) {
      const texts: { name: string; text: string }[] = [];
      let ocr = 0;
      for (const d of docs) {
        try {
          const out = await fileToText(d.name, d.buf);
          if (out.ocr) ocr++;
          texts.push({ name: d.name, text: out.text });
        } catch {
          texts.push({ name: d.name, text: "" });
        }
      }
      const p = analyzeDossier(texts, params);
      rows.push({
        case: caseName,
        files: docs.map((d) => d.name),
        ocr,
        title: p.title ?? null,
        eventDate: p.eventDate ?? null,
        monthlyBase: p.monthlyBase ?? null,
        insuredOnEvent: p.insuredOnEvent,
        insuredReason: p.insuredReason,
        verdict: p.verdict,
        total: p.result?.total ?? null,
        zusOutcome: p.zusOutcome,
        agreement: p.agreement,
        missing: p.missing,
      });
    }
    const compared = rows.filter((r) => r.agreement !== null);
    const agreed = compared.filter((r) => r.agreement).length;
    return Response.json({
      rows,
      summary: { cases: rows.length, compared: compared.length, agreed, disagreed: compared.length - agreed, noZus: rows.filter((r) => !r.zusOutcome).length, rate: compared.length ? Math.round((agreed / compared.length) * 1000) / 10 : null },
    });
  } catch (e) {
    return Response.json({ error: "Nie udało się przetworzyć plików: " + String(e) }, { status: 400 });
  }
}

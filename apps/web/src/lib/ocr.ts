import os from "os";
import { createRequire } from "module";

// OCR (Tesseract.js, język polski) – dla skanów PDF bez warstwy tekstowej i zdjęć dokumentów.
// Model językowy z pakietu @tesseract.js-data/pol (lokalnie – działa bez internetu, np. w infrastrukturze ZUS).
type Worker = { recognize: (img: Buffer | Uint8Array) => Promise<{ data: { text: string; confidence: number } }> };
let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const require = createRequire(import.meta.url);
      const lang = require("@tesseract.js-data/pol") as { langPath: string; gzip: boolean };
      const { createWorker } = await import("tesseract.js");
      return (await createWorker("pol", 1, { langPath: lang.langPath, gzip: lang.gzip, cachePath: os.tmpdir() })) as unknown as Worker;
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

export async function ocrImage(img: Uint8Array): Promise<{ text: string; confidence: number }> {
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("OCR: przekroczono limit czasu")), 90_000));
  const w = await Promise.race([getWorker(), timeout]);
  const { data } = await Promise.race([w.recognize(Buffer.from(img)), timeout]);
  return { text: data.text, confidence: Math.round(data.confidence) };
}

export const isImage = (name: string) => /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(name);

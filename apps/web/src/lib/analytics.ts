import { promises as fs } from "fs";
import path from "path";

// Anonimowe statystyki (wyłącznie liczniki kategorii – bez kwot, dat i danych osobowych).
// Cel: pokazać ZUS, o co rodzice najczęściej pytają i gdzie najczęściej grozi im utrata świadczeń.
const FILE = path.join(process.cwd(), "data", "stats.json");

export interface Stats {
  since: string;
  plans: number;
  questions: number;
  intents: Record<string, number>;
  risks: Record<string, number>;
  scenarios: Record<string, number>;
  titles: Record<string, number>;
}

let mem: Stats | null = null;
const empty = (): Stats => ({ since: new Date().toISOString(), plans: 0, questions: 0, intents: {}, risks: {}, scenarios: {}, titles: {} });

export async function getStats(): Promise<Stats> {
  if (mem) return mem;
  try {
    mem = JSON.parse(await fs.readFile(FILE, "utf8")) as Stats;
  } catch {
    mem = empty();
  }
  return mem;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(mem));
    } catch {
      /* read-only FS */
    }
  }, 1000);
}

const inc = (o: Record<string, number>, k: string) => {
  const key = k.slice(0, 80);
  o[key] = (o[key] ?? 0) + 1;
};

export async function trackQuestion(intent: string) {
  const s = await getStats();
  s.questions++;
  inc(s.intents, intent);
  persistSoon();
}

export async function trackPlan(e: { scenario?: string; titles?: string[]; risks?: string[] }) {
  const s = await getStats();
  s.plans++;
  if (e.scenario) inc(s.scenarios, e.scenario);
  for (const t of e.titles ?? []) inc(s.titles, t);
  // tytuły ryzyk bez prefiksu osoby i bez liczb (np. kwot zadłużenia)
  for (const r of new Set((e.risks ?? []).map((x) => x.replace(/^(Matka|Ojciec):\s*/, "").replace(/[\d\s.,]+zł/g, "").trim()))) inc(s.risks, r);
  persistSoon();
}

export async function resetStats() {
  mem = empty();
  persistSoon();
  return mem;
}

import { DEFAULT_PARAMS, SUPPORT_ORGS, type Params, type SupportOrg } from "@zus/engine";
import { promises as fs } from "fs";
import path from "path";

// Prosty magazyn parametrów: plik JSON (dev) + pamięć procesu (fallback w środowisku read-only).
// W produkcji: baza danych z wersjonowaniem i audytem zmian.
const FILE = path.join(process.cwd(), "data", "params.json");

export interface Change {
  at: string;
  version: string;
  note?: string;
  changes: { path: string; from: unknown; to: unknown }[];
}

export interface Config {
  params: Params;
  support: SupportOrg[];
  history?: Change[];
}

let memory: Config | null = null;

export async function getConfig(): Promise<Config> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(FILE, "utf8")) as Config;
  } catch {
    memory = { params: structuredClone(DEFAULT_PARAMS), support: structuredClone(SUPPORT_ORGS), history: [] };
  }
  return memory;
}

/** Lista zmienionych pól (płaskie ścieżki) między dwiema wersjami parametrów. */
function diff(a: unknown, b: unknown, prefix = ""): Change["changes"] {
  if (typeof a === "object" && a && typeof b === "object" && b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) => (k === "updatedAt" ? [] : diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k)));
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ path: prefix, from: a, to: b }];
}

async function persist(c: Config) {
  memory = c;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(c, null, 2));
  } catch {
    /* read-only FS – zostaje w pamięci */
  }
  return c;
}

export async function saveConfig(next: Config, note?: string) {
  const prev = await getConfig();
  const changes = diff(prev.params, next.params);
  if (diff(prev.support, next.support).length) changes.push({ path: "support", from: `${prev.support.length} org.`, to: `${next.support.length} org.` });
  const history = [...(prev.history ?? [])];
  if (changes.length) history.unshift({ at: new Date().toISOString(), version: next.params.version, note, changes });
  next.params.updatedAt = new Date().toISOString().slice(0, 10);
  return persist({ params: next.params, support: next.support, history: history.slice(0, 50) });
}

export async function resetConfig() {
  return saveConfig({ params: structuredClone(DEFAULT_PARAMS), support: structuredClone(SUPPORT_ORGS) }, "Przywrócono wartości domyślne");
}

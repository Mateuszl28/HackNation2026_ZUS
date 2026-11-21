import { DEFAULT_PARAMS, SUPPORT_ORGS, type Params, type SupportOrg } from "@zus/engine";
import { promises as fs } from "fs";
import path from "path";

// Prosty magazyn parametrów: plik JSON (dev) + pamięć procesu (fallback w środowisku read-only).
// W produkcji: baza danych z wersjonowaniem i audytem zmian.
const FILE = path.join(process.cwd(), "data", "params.json");

export interface Config {
  params: Params;
  support: SupportOrg[];
}

let memory: Config | null = null;

export async function getConfig(): Promise<Config> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(FILE, "utf8")) as Config;
  } catch {
    memory = { params: DEFAULT_PARAMS, support: SUPPORT_ORGS };
  }
  return memory;
}

export async function saveConfig(c: Config) {
  c.params.updatedAt = new Date().toISOString().slice(0, 10);
  memory = c;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(c, null, 2));
  } catch {
    /* read-only FS – zostaje w pamięci */
  }
  return c;
}

export async function resetConfig() {
  return saveConfig({ params: structuredClone(DEFAULT_PARAMS), support: structuredClone(SUPPORT_ORGS) });
}

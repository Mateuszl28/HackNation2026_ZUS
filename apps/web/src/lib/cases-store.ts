import { promises as fs } from "fs";
import path from "path";
import type { DecisionType } from "@zus/engine";

// Magazyn spraw: wnioski złożone przez obywateli do ZUS i decyzje urzędników.
// Demo: plik JSON + pamięć procesu. Produkcja: system dziedzinowy ZUS (KSI) przez API.
const FILE = path.join(process.cwd(), "data", "cases.json");

export interface StoredApplication {
  id: string;
  caseId: string;
  title: string;
  to: string;
  sentAt: number;
}

export interface Decision {
  id: string;
  caseId: string;
  type: DecisionType;
  by: string;
  at: string;
  justification: string;
  legalBasis: string[];
  missingDocs?: string[];
  benefit?: { who: string; label: string; from: string; to: string; monthly: number; total: number }[];
  total?: number;
}

interface Store {
  applications: StoredApplication[];
  decisions: Decision[];
}

let mem: Store | null = null;

async function load(): Promise<Store> {
  if (mem) return mem;
  try {
    mem = JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch {
    mem = { applications: [], decisions: [] };
  }
  return mem;
}

async function persist() {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(mem));
  } catch {
    /* read-only FS */
  }
}

export async function addApplication(a: StoredApplication) {
  const s = await load();
  if (!s.applications.some((x) => x.id === a.id)) s.applications.unshift(a);
  s.applications = s.applications.slice(0, 500);
  await persist();
  return a;
}

export async function addDecision(d: Decision) {
  const s = await load();
  s.decisions.unshift(d);
  await persist();
  return d;
}

export async function forCase(caseId: string) {
  const s = await load();
  return { applications: s.applications.filter((a) => a.caseId === caseId), decisions: s.decisions.filter((d) => d.caseId === caseId) };
}

export async function allCases() {
  return load();
}

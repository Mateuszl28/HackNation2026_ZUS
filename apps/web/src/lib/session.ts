"use client";
import { useEffect, useState, useCallback } from "react";
import { DEFAULT_PARAMS, calculate, type CalcInput, type Params } from "@zus/engine";

export interface SentApplication {
  id: string;
  title: string;
  to: string;
  sentAt: number;
}

export interface Session {
  user?: { name: string; caseId: string };
  input?: CalcInput;
  applications?: SentApplication[];
}

/** Status wniosku: do pracodawcy – symulacja kadr; do ZUS – realny stan sprawy (decyzja urzędnika). */
export function applicationStatus(a: SentApplication, now = Date.now(), decision?: { type: string; at: string } | null) {
  const s = (now - a.sentAt) / 1000;
  if (a.to.startsWith("Pracodawca")) {
    const steps = ["Wysłany do pracodawcy", "Przyjęty przez kadry", "Urlop udzielony"];
    const step = s < 20 ? 0 : s < 60 ? 1 : 2;
    return { steps, step, done: step === 2 };
  }
  const label = decision ? ({ grant: "Decyzja: świadczenie przyznane", refuse: "Decyzja: odmowa", request: "Wezwanie do uzupełnienia dokumentów" } as Record<string, string>)[decision.type] : "Decyzja urzędnika";
  const steps = ["Złożony – UPO wydane", "W weryfikacji u urzędnika ZUS", label];
  const decided = !!decision && new Date(decision.at).getTime() >= a.sentAt - 5000;
  const step = decided ? 2 : s < 20 ? 0 : 1;
  return { steps, step, done: decided };
}

const KEY = "zpr-session";
const read = (): Session => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
};

export function useSession() {
  const [s, setS] = useState<Session>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setS(read());
    setReady(true);
    const h = () => setS(read());
    window.addEventListener("zpr-session", h);
    return () => window.removeEventListener("zpr-session", h);
  }, []);
  const update = useCallback((patch: Partial<Session> | null) => {
    const next = patch === null ? {} : { ...read(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setS(next);
    window.dispatchEvent(new Event("zpr-session"));
  }, []);
  return { session: s, ready, update };
}

export function useParams() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  useEffect(() => {
    fetch("/api/params")
      .then((r) => r.json())
      .then((c) => c?.params && setParams(c.params))
      .catch(() => {});
  }, []);
  return params;
}

export const DEFAULT_INPUT: CalcInput = {
  scenario: "birth",
  eventDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
  children: 1,
  zaZyciem: false,
  prematurity: "none",
  hospitalDays: 0,
  mother: { title: "employment", monthlyBase: 7000, largeEmployer: true },
  father: { title: "employment", monthlyBase: 7000 },
  plan: { prenatalWeeks: 0, motherParentalWeeks: 32, fatherParentalWeeks: 9, paternity: true, oneApplication: false },
};

/** Anonimowe zgłoszenie zapisanego planu do statystyk (kategorie, bez kwot i danych osobowych). */
export function reportPlan(input: CalcInput, params: Params = DEFAULT_PARAMS) {
  try {
    const r = calculate(input, params);
    const body = JSON.stringify({ scenario: input.scenario, titles: [input.mother.title, input.father.title], risks: r.notices.filter((n) => n.level !== "info").map((n) => n.title) });
    fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {}
}

/** Odczyt pliku (PDF) i dołączenie go do sprawy obywatela w ZUS. */
export async function uploadToCase(file: File, caseId: string, name: string, inResponseTo?: string) {
  const fd = new FormData();
  fd.append("file", file);
  const parsed = await fetch("/api/parse", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({}));
  const r = await fetch("/api/applications/documents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ caseId, name, fileName: file.name, formType: parsed?.formType, fields: parsed?.fields ?? [], inResponseTo }),
  });
  if (!r.ok) throw new Error("Nie udało się przesłać dokumentu");
  return r.json();
}

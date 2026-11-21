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

/** Symulowany status wniosku w PUE/eZUS – zależny od czasu od wysłania (przyspieszony na potrzeby demo). */
export function applicationStatus(a: SentApplication, now = Date.now()) {
  const s = (now - a.sentAt) / 1000;
  const employer = a.to.startsWith("Pracodawca");
  const steps = employer
    ? ["Wysłany do pracodawcy", "Przyjęty przez kadry", "Urlop udzielony"]
    : ["Złożony – UPO wydane", "W weryfikacji (sprawdzenie ubezpieczenia i podstawy)", "Decyzja: świadczenie przyznane"];
  const step = s < 20 ? 0 : s < 60 ? 1 : 2;
  return { steps, step, done: step === 2 };
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

"use client";
import { useEffect, useState, useCallback } from "react";
import { DEFAULT_PARAMS, type CalcInput, type Params } from "@zus/engine";

export interface Session {
  user?: { name: string; caseId: string };
  input?: CalcInput;
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

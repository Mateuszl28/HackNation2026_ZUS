"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_PARAMS, type Params, type SupportOrg } from "@zus/engine";

export interface HistoryEntry { at: string; version: string; note?: string; changes: { path: string; from: unknown; to: unknown }[] }
export interface AdminConfig { params: Params; support: SupportOrg[]; history?: HistoryEntry[] }

interface Ctx {
  official: string;
  role: "official" | "manager" | "";
  roleLabel: string;
  saved: AdminConfig | null; // stan na serwerze
  draft: AdminConfig | null; // edytowany
  setDraft: (c: AdminConfig) => void;
  dirty: boolean;
  save: (note?: string) => Promise<boolean>;
  reset: () => Promise<boolean>;
  discard: () => void;
  msg: { ok: boolean; text: string } | null;
  logout: () => Promise<void>;
}

const C = createContext<Ctx | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [official, setOfficial] = useState("");
  const [role, setRole] = useState<"official" | "manager" | "">("");
  const [roleLabel, setRoleLabel] = useState("");
  const [saved, setSaved] = useState<AdminConfig | null>(null);
  const [draft, setDraft] = useState<AdminConfig | null>(null);
  const [msg, setMsg] = useState<Ctx["msg"]>(null);

  useEffect(() => {
    fetch("/api/params").then((r) => r.json()).then((c) => { setSaved(c); setDraft(structuredClone(c)); });
    fetch("/api/admin/session").then((r) => r.json()).then((j) => { if (!j.authenticated) return router.replace("/admin/logowanie"); setOfficial(j.login); setRole(j.role); setRoleLabel(j.roleLabel); });
  }, [router]);

  const dirty = useMemo(() => !!saved && !!draft && JSON.stringify({ p: saved.params, s: saved.support }) !== JSON.stringify({ p: draft.params, s: draft.support }), [saved, draft]);

  const put = useCallback(async (body: unknown, okText: string) => {
    const r = await fetch("/api/params", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { router.replace("/admin/logowanie"); return false; }
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Błąd zapisu" }); return false; }
    setSaved(j);
    setDraft(structuredClone(j));
    setMsg({ ok: true, text: okText });
    setTimeout(() => setMsg(null), 4000);
    return true;
  }, [router]);

  const value: Ctx = {
    official,
    role,
    roleLabel,
    saved,
    draft,
    setDraft,
    dirty,
    save: (note) => put({ ...draft, note }, "Zapisano – kalkulatory w webie, API i aplikacji mobilnej używają nowych wartości."),
    reset: () => put({ reset: true }, "Przywrócono wartości domyślne."),
    discard: () => saved && setDraft(structuredClone(saved)),
    msg,
    logout: async () => {
      await fetch("/api/admin/session", { method: "DELETE" });
      router.replace("/admin/logowanie");
    },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAdmin() {
  const c = useContext(C);
  if (!c) throw new Error("useAdmin poza AdminProvider");
  return c;
}

export const DEFAULTS = DEFAULT_PARAMS;

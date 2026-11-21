"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { DECISION_LABELS, type DecisionType } from "@zus/engine";

interface N { id: string; type: DecisionType; at: string }

/** Powiadomienia obywatela o decyzjach i wezwaniach ZUS (symulacja powiadomień push/e-mail z PUE/eZUS). */
export default function NotificationsBell({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<N[]>([]);
  const [seen, setSeen] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const key = `zpr-seen-${caseId}`;

  const load = useCallback(() => {
    fetch(`/api/applications?caseId=${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setItems(j.decisions ?? []))
      .catch(() => {});
  }, [caseId]);

  useEffect(() => {
    try {
      setSeen(Number(localStorage.getItem(key) ?? 0));
    } catch {}
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [key, load]);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const unread = items.filter((i) => new Date(i.at).getTime() > seen).length;
  const markSeen = () => {
    const now = Date.now();
    setSeen(now);
    try {
      localStorage.setItem(key, String(now));
    } catch {}
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen((v) => !v); if (!open) markSeen(); }} className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white hover:bg-slate-50" aria-label={`Powiadomienia${unread ? ` (${unread} nowe)` : ""}`}>
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Powiadomienia z ZUS</p>
          {!items.length ? (
            <p className="px-2 py-3 text-sm text-muted">Brak powiadomień. Gdy urzędnik rozpatrzy Twój wniosek, zobaczysz to tutaj.</p>
          ) : (
            items.slice(0, 5).map((i) => (
              <Link key={i.id} href="/pulpit" onClick={() => setOpen(false)} className="block rounded-xl p-2 hover:bg-slate-50">
                <p className="text-sm font-semibold">{i.type === "request" ? "Wezwanie do uzupełnienia dokumentów" : DECISION_LABELS[i.type]}</p>
                <p className="text-xs text-muted">{i.id} · {new Date(i.at).toLocaleString("pl-PL")}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

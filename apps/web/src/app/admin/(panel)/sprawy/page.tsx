"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, Download, Search } from "lucide-react";
import { DECISION_LABELS, pln, type DecisionType } from "@zus/engine";

interface Row {
  id: string;
  name: string;
  title: string;
  scenario: string;
  eventDate: string;
  insured: boolean;
  total: number;
  recommendation: DecisionType;
  manualChecks: number;
  applications: number;
  lastApplicationAt: number | null;
  decision: { type: DecisionType; at: string; by: string } | null;
  documents: number;
  docsAfterDecision: boolean;
  sla: { days: number; left: number; deadline: string; level: "ok" | "warning" | "danger" } | null;
}

const SCEN: Record<string, string> = { birth: "Poród", adoption: "Adopcja", foster: "Rodzina zastępcza" };
const REC_STYLE: Record<DecisionType, string> = { grant: "bg-brand-light text-brand", refuse: "bg-red-100 text-red-800", request: "bg-amber-100 text-amber-800" };
const REC_SHORT: Record<DecisionType, string> = { grant: "przyznać", refuse: "odmówić", request: "wezwać" };

function statusOf(r: Row) {
  if (r.docsAfterDecision) return { key: "todo", label: "Uzupełniono dokumenty – do decyzji", cls: "bg-amber-100 text-amber-800" };
  if (r.decision && (!r.lastApplicationAt || new Date(r.decision.at).getTime() >= r.lastApplicationAt)) return { key: "done", label: DECISION_LABELS[r.decision.type], cls: "bg-slate-100 text-slate-700" };
  if (r.applications) return { key: "todo", label: "Nowy wniosek – do decyzji", cls: "bg-accent/10 text-accent" };
  return { key: "todo", label: "Do weryfikacji", cls: "bg-slate-100 text-slate-600" };
}

export default function CasesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<"all" | "todo" | "done">("todo");
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = () => fetch("/api/admin/cases").then((r) => (r.status === 401 ? router.replace("/admin/logowanie") : r.json())).then((j) => Array.isArray(j) && setRows(j));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [router]);

  const list = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => (tab === "all" ? true : statusOf(r).key === tab))
      .filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (a.sla?.left ?? 999) - (b.sla?.left ?? 999) || (b.lastApplicationAt ?? 0) - (a.lastApplicationAt ?? 0));
  }, [rows, tab, q]);
  const count = (k: "todo" | "done") => rows?.filter((r) => statusOf(r).key === k).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1>Sprawy</h1>
        <p className="text-muted">Osoby ubiegające się o świadczenia. System podpowiada rozstrzygnięcie – decyzję zawsze podejmuje urzędnik.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-white p-1 text-sm shadow-sm">
          {([["todo", `Do decyzji (${count("todo")})`], ["done", `Rozpatrzone (${count("done")})`], ["all", "Wszystkie"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 ${tab === k ? "bg-[#123a5c] font-semibold text-white" : "text-slate-600"}`}>{l}</button>
          ))}
        </div>
        <a href="/api/admin/export?type=cases" className="btn-ghost ml-auto !py-1.5 text-sm"><Download size={15} /> Eksport CSV</a>
        <label className="relative">
          <Search size={16} className="absolute left-3 top-3 text-muted" />
          <input className="input !w-64 pl-9" placeholder="Szukaj osoby…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <section className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Osoba</th><th>Sytuacja</th><th>Ubezpieczenie</th><th>Rekomendacja systemu</th><th>Status</th><th>Termin (30 dni)</th><th className="text-right">Kwota</th><th /></tr>
          </thead>
          <tbody>
            {!rows && <tr><td colSpan={8} className="px-4 py-6 text-muted">Ładowanie…</td></tr>}
            {list.map((r) => {
              const st = statusOf(r);
              return (
                <tr key={r.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => router.push(`/admin/sprawy/${r.id}`)}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/sprawy/${r.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{r.name}</Link>
                    <p className="max-w-xs truncate text-xs text-muted">{r.title.split(" – ")[1]}</p>
                  </td>
                  <td>{SCEN[r.scenario]}<p className="text-xs text-muted">{r.eventDate}</p></td>
                  <td>{r.insured ? <span className="text-brand">✓ tak</span> : <span className="text-red-700">✕ brak</span>}</td>
                  <td>
                    <span className={`chip ${REC_STYLE[r.recommendation]}`}>{REC_SHORT[r.recommendation]}</span>
                    {r.manualChecks > 0 && <span className="ml-1 inline-flex items-center text-xs text-amber-700" title="Wymaga ręcznej weryfikacji"><AlertTriangle size={13} className="mr-0.5" />weryfikacja</span>}
                  </td>
                  <td><span className={`chip ${st.cls}`}>{st.label}</span>{(r.applications > 0 || r.documents > 0) && <p className="text-xs text-muted">wniosków: {r.applications} · dokumentów: {r.documents}</p>}</td>
                  <td>
                    {r.sla && st.key === "todo" ? (
                      <span className={`chip ${r.sla.level === "danger" ? "bg-red-100 text-red-800" : r.sla.level === "warning" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`} title={`Termin: ${r.sla.deadline}`}>
                        {r.sla.left < 0 ? `po terminie ${-r.sla.left} dni` : `zostało ${r.sla.left} dni`}
                      </span>
                    ) : <span className="text-xs text-muted">–</span>}
                  </td>
                  <td className="text-right tabular-nums">{r.total ? pln(r.total) : "–"}</td>
                  <td className="pr-4 text-right"><ChevronRight size={16} className="inline text-muted" /></td>
                </tr>
              );
            })}
            {rows && !list.length && <tr><td colSpan={8} className="px-4 py-6 text-muted">Brak spraw w tym widoku.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, FolderKanban, FileCheck2, HeartHandshake, History, HelpCircle, SlidersHorizontal } from "lucide-react";
import { Ranking, INTENT_LABELS, type Stats } from "@/components/StatsPanel";
import { useAdmin } from "@/components/admin/AdminContext";

export default function Overview() {
  const { saved, official } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todo, setTodo] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/stats").then((r) => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
    fetch("/api/admin/cases").then((r) => (r.ok ? r.json() : [])).then((rows: { applications: number; lastApplicationAt: number | null; decision: { at: string } | null }[]) => setTodo(rows.filter((r) => !(r.decision && (!r.lastApplicationAt || new Date(r.decision.at).getTime() >= r.lastApplicationAt))).length)).catch(() => {});
  }, []);

  const riskCount = stats ? Object.values(stats.risks).reduce((a, b) => a + b, 0) : 0;
  const tiles = [
    { label: "Zapisane plany", value: stats?.plans ?? "–", icon: FileCheck2 },
    { label: "Pytania do asystenta", value: stats?.questions ?? "–", icon: Bot },
    { label: "Wykryte ryzyka", value: stats ? riskCount : "–", icon: AlertTriangle },
    { label: "Pytania nierozpoznane", value: stats?.intents.fallback ?? (stats ? 0 : "–"), icon: HelpCircle },
  ];
  const last = saved?.history?.slice(0, 3) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1>Dzień dobry{official ? `, ${official}` : ""}</h1>
        <p className="text-muted">Przegląd działania Przewodnika Rodzica i obowiązujących parametrów.</p>
      </div>

      <Link href="/admin/sprawy" className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#123a5c] to-[#1d5a8a] p-5 text-white shadow-sm transition hover:shadow-md">
        <FolderKanban size={28} />
        <div className="flex-1">
          <p className="text-2xl font-bold">{todo ?? "…"} {todo === 1 ? "sprawa czeka" : "spraw czeka"} na decyzję</p>
          <p className="text-sm text-white/75">Przejdź do kolejki spraw – rekomendacja systemu, dane z ZUS i wydanie decyzji w jednym miejscu.</p>
        </div>
        <ArrowRight />
      </Link>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card !p-5">
            <t.icon className="mb-2 text-[#123a5c]" size={20} />
            <p className="text-3xl font-bold tabular-nums">{t.value}</p>
            <p className="text-sm text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2>Gdzie rodzice tracą świadczenia</h2><Link href="/admin/statystyki" className="text-sm font-semibold text-accent">Więcej →</Link></div>
          {stats ? <Ranking title="Najczęstsze ryzyka" data={stats.risks} total={stats.plans} /> : <p className="text-sm text-muted">Ładowanie…</p>}
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2>O co pytają</h2><Link href="/admin/statystyki" className="text-sm font-semibold text-accent">Więcej →</Link></div>
          {stats ? <Ranking title="Tematy pytań do asystenta" data={stats.intents} labels={INTENT_LABELS} total={stats.questions} /> : <p className="text-sm text-muted">Ładowanie…</p>}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2"><History size={18} /> Ostatnie zmiany parametrów</h2><Link href="/admin/historia" className="text-sm font-semibold text-accent">Cała historia →</Link></div>
          {!last.length ? (
            <p className="text-sm text-muted">Brak zmian – obowiązują wartości domyślne (stan prawny 2026).</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {last.map((h, i) => (
                <li key={i} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-medium">{new Date(h.at).toLocaleString("pl-PL")} · v{h.version}</p>
                  <p className="text-muted">{h.note || "bez opisu"} · zmienionych pól: {h.changes.length}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="mb-3">Szybkie akcje</h2>
          <div className="grid gap-2">
            {[
              { href: "/admin/parametry", label: "Zmień parametry prawne", desc: "Stawki, wymiary urlopów, limity", icon: SlidersHorizontal },
              { href: "/admin/organizacje", label: "Zarządzaj organizacjami wsparcia", desc: `${saved?.support.length ?? "…"} organizacji`, icon: HeartHandshake },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-[#123a5c]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#123a5c]/10 text-[#123a5c]"><a.icon size={18} /></span>
                <span className="flex-1"><span className="block font-semibold">{a.label}</span><span className="text-xs text-muted">{a.desc}</span></span>
                <ArrowRight size={16} className="text-muted" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

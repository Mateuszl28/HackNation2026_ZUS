"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Info, OctagonAlert, TrendingDown, TrendingUp } from "lucide-react";
import { pln, whatIf, type Change, type ChangeKind, type InsuranceTitle } from "@zus/engine";
import { DEFAULT_INPUT, useParams, useSession } from "@/lib/session";

const KINDS: { v: ChangeKind; label: string; desc: string }[] = [
  { v: "raise", label: "Podwyżka / wyższa podstawa", desc: "Dostanę podwyżkę lub podniosę podstawę składek" },
  { v: "endContract", label: "Koniec umowy", desc: "Umowa kończy się przed porodem" },
  { v: "newContract", label: "Nowa umowa / firma", desc: "Zaczynam nową pracę, zlecenie lub działalność" },
  { v: "stopVoluntary", label: "Rezygnacja z chorobowego", desc: "Wyrejestruję się z dobrowolnego ubezpieczenia" },
];

export default function WhatIfPage() {
  const params = useParams();
  const { session } = useSession();
  const input = session.input ?? DEFAULT_INPUT;
  const today = new Date().toISOString().slice(0, 10);
  const [ch, setCh] = useState<Change>({ kind: "raise", who: "mother", date: today, newGross: Math.round((input.mother.monthlyBase || 7000) * 1.2), newTitle: "mandate" });
  const set = (p: Partial<Change>) => setCh((c) => ({ ...c, ...p }));
  const r = useMemo(() => whatIf(input, ch, params), [input, ch, params]);
  const up = r.diff >= 0;

  return (
    <div className="space-y-6">
      <div>
        <h1>Co jeśli…? – zmiana pracy w ciąży</h1>
        <p className="text-muted">Sprawdź, zanim podpiszesz: jak zmiana warunków zatrudnienia wpłynie na prawo do zasiłku i jego wysokość. {session.input ? "Liczymy na Twoim planie." : <>Liczymy na przykładowych danych – <Link href="/logowanie?next=/co-jesli" className="font-semibold text-accent">zaloguj się</Link>, aby użyć swoich.</>}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KINDS.map((k) => (
          <button key={k.v} onClick={() => set({ kind: k.v })} className={`card !p-4 text-left transition ${ch.kind === k.v ? "!border-brand ring-2 ring-brand/20" : "hover:border-slate-300"}`}>
            <p className="font-semibold">{k.label}</p>
            <p className="mt-1 text-xs text-muted">{k.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit space-y-3">
          <label className="block"><span className="label">Kogo dotyczy</span>
            <select className="input" value={ch.who} onChange={(e) => set({ who: e.target.value as Change["who"] })}><option value="mother">Matka</option><option value="father">Ojciec</option></select>
          </label>
          <label className="block"><span className="label">Data zmiany</span><input type="date" className="input" value={ch.date} onChange={(e) => set({ date: e.target.value })} /></label>
          <p className="text-xs text-muted">Termin porodu w planie: <b>{input.eventDate}</b></p>
          {(ch.kind === "raise" || ch.kind === "newContract") && (
            <label className="block"><span className="label">{ch.kind === "raise" ? "Nowe wynagrodzenie / podstawa brutto" : "Wynagrodzenie / podstawa w nowej umowie"}</span>
              <div className="relative"><input type="number" step={100} className="input pr-10" value={ch.newGross ?? 0} onChange={(e) => set({ newGross: +e.target.value })} /><span className="absolute right-3 top-2.5 text-sm text-muted">zł</span></div>
              {ch.kind === "raise" && <span className="text-xs text-muted">obecnie: {pln(input[ch.who].monthlyBase)}</span>}
            </label>
          )}
          {ch.kind === "newContract" && (
            <label className="block"><span className="label">Rodzaj</span>
              <select className="input" value={ch.newTitle} onChange={(e) => set({ newTitle: e.target.value as InsuranceTitle })}><option value="employment">Umowa o pracę</option><option value="mandate">Umowa zlecenia</option><option value="business">Działalność gospodarcza</option></select>
            </label>
          )}
          {ch.kind === "endContract" && (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!ch.fixedTerm} onChange={(e) => set({ fixedTerm: e.target.checked })} /> Umowa o pracę na czas określony</label>
              {ch.fixedTerm && <label className="block"><span className="label">Początek ciąży (w przybliżeniu)</span><input type="date" className="input" value={ch.pregnancyStart ?? ""} onChange={(e) => set({ pregnancyStart: e.target.value })} /></label>}
            </>
          )}
        </section>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card !p-4"><p className="text-xs text-muted">Zasiłek bez zmiany</p><p className="text-2xl font-bold">{pln(r.before)}</p></div>
            <div className="card !p-4"><p className="text-xs text-muted">Zasiłek po zmianie</p><p className="text-2xl font-bold">{pln(r.after)}</p></div>
            <div className={`card !p-4 ${up ? "!border-brand/40 bg-brand-light/50" : "!border-red-200 bg-red-50"}`}>
              <p className="text-xs text-muted">Różnica</p>
              <p className={`flex items-center gap-1 text-2xl font-bold ${up ? "text-brand" : "text-red-700"}`}>{up ? <TrendingUp size={22} /> : <TrendingDown size={22} />}{up ? "+" : ""}{pln(r.diff)}</p>
            </div>
          </div>
          {r.baseNote && <p className="flex gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900"><Info size={18} className="shrink-0" /> {r.baseNote}</p>}
          {r.risks.map((n, i) => {
            const Icon = n.level === "danger" ? OctagonAlert : n.level === "warning" ? AlertTriangle : Info;
            return <div key={i} className={`flex gap-3 rounded-xl border p-3 text-sm ${n.level === "danger" ? "border-red-200 bg-red-50 text-red-900" : n.level === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}><Icon size={18} className="mt-0.5 shrink-0" /><span><b>{n.title}.</b> {n.text}</span></div>;
          })}
          {!r.risks.length && <p className="rounded-xl bg-brand-light p-3 text-sm text-brand">Ta zmiana nie niesie istotnego ryzyka dla prawa do zasiłku.</p>}
          <Link href="/asystent" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">Masz wątpliwości? Zapytaj asystenta <ArrowRight size={14} /></Link>
        </div>
      </div>
    </div>
  );
}

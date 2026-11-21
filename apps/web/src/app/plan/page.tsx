"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Baby, CalendarClock, Check, Copy, Share2 } from "lucide-react";
import { buildChecklist, calculate, encodePlan, pln, pregnancyProgress, PHASE_LABELS, type Phase } from "@zus/engine";
import { useParams, useSession } from "@/lib/session";

const PHASES: Phase[] = ["now", "beforeBirth", "afterBirth", "later"];
const TODAY = new Date().toISOString().slice(0, 10);

export default function PlanPage() {
  const params = useParams();
  const { session, ready } = useSession();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const key = `zpr-done-${session.user?.caseId ?? "anon"}`;

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {}
  }, [key]);
  const toggle = (id: string) =>
    setDone((d) => {
      const n = { ...d, [id]: !d[id] };
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {}
      return n;
    });

  const input = session.input;
  const result = useMemo(() => (input ? calculate(input, params) : null), [input, params]);
  const items = useMemo(() => (input && result ? buildChecklist(input, result, TODAY, params) : []), [input, result, params]);

  if (!ready) return null;
  if (!input || !result)
    return (
      <div className="card mx-auto max-w-lg space-y-3 text-center">
        <h1>Mój plan</h1>
        <p className="text-muted">Najpierw ustal swoją sytuację w kalkulatorze lub kreatorze.</p>
        <Link href="/kreator" className="btn-primary">Przejdź do kreatora</Link>
      </div>
    );

  const isBirth = input.scenario === "birth";
  const prog = pregnancyProgress(input.eventDate, TODAY);
  const doneCount = items.filter((i) => done[i.id]).length;
  const share = async () => {
    const url = `${window.location.origin}/kalkulator?plan=${encodePlan(input)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Nasz plan urlopów", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Mój plan</h1>
          <p className="text-muted">Lista kroków ułożona pod Twoją sytuację – odhaczaj, co już zrobione.</p>
        </div>
        <button onClick={share} className="btn-ghost text-sm">{copied ? <><Copy size={16} /> Skopiowano link</> : <><Share2 size={16} /> Udostępnij plan partnerowi</>}</button>
      </div>

      <section className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="card relative overflow-hidden !p-6">
          {isBirth ? (
            <>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-brand"><Baby /></span>
                <div>
                  <p className="text-sm text-muted">{prog.born ? "Dziecko jest już na świecie" : `Trymestr ${prog.trimester}`}</p>
                  <p className="text-2xl font-bold">{prog.born ? `${-prog.daysLeft} dni po porodzie` : `${prog.week}. tydzień ciąży`}</p>
                </div>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400" style={{ width: `${prog.percent}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted"><span>start</span><span>{prog.born ? "poród" : `do porodu: ${prog.daysLeft} dni (${input.eventDate})`}</span></div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-brand"><CalendarClock /></span>
              <div>
                <p className="text-sm text-muted">{input.scenario === "adoption" ? "Adopcja" : "Rodzina zastępcza"}</p>
                <p className="text-2xl font-bold">Przyjęcie dziecka: {input.eventDate}</p>
              </div>
            </div>
          )}
        </div>
        <div className="card !p-6">
          <p className="text-sm text-muted">Postęp</p>
          <p className="text-3xl font-bold">{doneCount} / {items.length}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-accent transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} /></div>
          <p className="mt-3 text-sm">Szacowany zasiłek: <b>{pln(result.total)}</b></p>
        </div>
      </section>

      {PHASES.map((ph) => {
        const list = items.filter((i) => i.phase === ph);
        if (!list.length) return null;
        return (
          <section key={ph} className="card">
            <h2 className="mb-3 flex items-center gap-2">{PHASE_LABELS[ph]} <span className="chip bg-slate-100">{list.filter((i) => done[i.id]).length}/{list.length}</span></h2>
            <ul className="divide-y divide-slate-100">
              {list.map((it) => {
                const overdue = !done[it.id] && it.due && it.due < TODAY;
                return (
                  <li key={it.id} className="flex items-start gap-3 py-3">
                    <button onClick={() => toggle(it.id)} aria-label={done[it.id] ? "Oznacz jako niezrobione" : "Oznacz jako zrobione"} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${done[it.id] ? "border-brand bg-brand text-white" : "border-slate-300 hover:border-brand"}`}>
                      {done[it.id] && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div className={`flex-1 ${done[it.id] ? "opacity-50" : ""}`}>
                      <p className={`font-medium ${done[it.id] ? "line-through" : ""}`}>
                        {it.title}
                        {it.critical && !done[it.id] && <span className="chip ml-2 bg-red-100 text-red-800">ważne</span>}
                      </p>
                      <p className="text-sm text-muted">{it.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      {it.due && <span className={`chip font-mono ${overdue ? "bg-red-100 text-red-800" : "bg-slate-100"}`}>{it.due}</span>}
                      <span className="text-xs text-muted">{it.who === "both" ? "oboje" : it.who === "mother" ? (isBirth ? "mama" : "rodzic 1") : isBirth ? "tata" : "rodzic 2"}</span>
                      {it.link && <Link href={it.link} className="flex items-center gap-0.5 text-xs font-semibold text-accent">otwórz <ArrowRight size={12} /></Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

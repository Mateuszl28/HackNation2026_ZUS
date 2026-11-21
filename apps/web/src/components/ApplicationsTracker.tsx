"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileClock, Loader2 } from "lucide-react";
import { applicationStatus, useSession } from "@/lib/session";

/** Status wysłanych wniosków (symulacja PUE/eZUS i systemu kadrowego pracodawcy). */
export default function ApplicationsTracker() {
  const { session } = useSession();
  const [now, setNow] = useState(() => Date.now());
  const apps = session.applications ?? [];
  const pending = apps.some((a) => !applicationStatus(a, now).done);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(t);
  }, [pending]);

  return (
    <section className="card">
      <h2 className="mb-3 flex items-center gap-2"><FileClock className="text-accent" /> Moje wnioski</h2>
      {!apps.length ? (
        <p className="text-sm text-muted">Nie wysłano jeszcze żadnych wniosków. <Link href="/wnioski" className="font-semibold text-accent">Przejdź do wniosków →</Link></p>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => {
            const st = applicationStatus(a, now);
            return (
              <li key={a.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  <span className="font-mono text-xs text-muted">{a.id} · {new Date(a.sentAt).toLocaleString("pl-PL")}</span>
                </div>
                <p className="text-xs text-muted">Adresat: {a.to}</p>
                <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                  {st.steps.map((label, i) => {
                    const state = i < st.step || st.done ? "done" : i === st.step ? "current" : "todo";
                    return (
                      <li key={label} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${state === "done" ? "bg-brand text-white" : state === "current" ? "bg-accent/15 text-accent" : "bg-slate-100 text-slate-400"}`}>
                          {state === "done" ? <Check size={12} strokeWidth={3} /> : state === "current" ? <Loader2 size={12} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </span>
                        <span className={state === "todo" ? "text-muted" : ""}>{label}</span>
                      </li>
                    );
                  })}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">Symulacja: statusy zmieniają się w przyspieszonym tempie (sekundy zamiast dni). W wersji produkcyjnej – dane z PUE/eZUS.</p>
    </section>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileClock, Gavel, Loader2, Printer, Upload } from "lucide-react";
import { DECISION_LABELS } from "@zus/engine";
import { applicationStatus, uploadToCase, useSession } from "@/lib/session";
import DecisionLetter, { type DecisionDoc } from "@/components/DecisionLetter";

/** Status wniosków obywatela + decyzje urzędnika ZUS (z serwera). */
export default function ApplicationsTracker() {
  const { session } = useSession();
  const [now, setNow] = useState(() => Date.now());
  const [decisions, setDecisions] = useState<DecisionDoc[]>([]);
  const [open, setOpen] = useState<DecisionDoc | null>(null);
  const [docs, setDocs] = useState<{ name: string; inResponseTo?: string; at: number }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const apps = session.applications ?? [];
  const caseId = session.user?.caseId;

  const load = useCallback(() => {
    if (!caseId) return;
    fetch(`/api/applications?caseId=${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j) { setDecisions(j.decisions ?? []); setDocs(j.documents ?? []); } })
      .catch(() => {});
  }, [caseId]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      setNow(Date.now());
      load();
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const latest = decisions[0] ?? null;

  return (
    <section className="card">
      <h2 className="mb-3 flex items-center gap-2"><FileClock className="text-accent" /> Moje wnioski i decyzje</h2>

      {latest && (
        <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl p-4 ${latest.type === "grant" ? "bg-brand-light" : latest.type === "refuse" ? "bg-red-50" : "bg-amber-50"}`}>
          <Gavel className={latest.type === "grant" ? "text-brand" : latest.type === "refuse" ? "text-red-600" : "text-amber-600"} />
          <div className="flex-1">
            <p className="font-semibold">{latest.type === "request" ? "ZUS wzywa do uzupełnienia dokumentów" : DECISION_LABELS[latest.type]}</p>
            <p className="text-sm text-muted">{latest.id} · {new Date(latest.at).toLocaleString("pl-PL")}</p>
          </div>
          <button className="btn-ghost !py-1.5 text-sm" onClick={() => setOpen(latest)}>Zobacz pismo</button>
        </div>
      )}

      {latest?.type === "request" && !!latest.missingDocs?.length && (
        <div className="mb-4 rounded-xl border border-amber-200 p-4">
          <p className="mb-2 font-semibold">Uzupełnij dokumenty (termin: 7 dni od doręczenia)</p>
          <ul className="space-y-2">
            {latest.missingDocs.map((m) => {
              const sent = docs.find((x) => x.name === m && x.inResponseTo === latest.id);
              return (
                <li key={m} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`flex-1 ${sent ? "text-muted line-through" : ""}`}>{m}</span>
                  {sent ? (
                    <span className="chip bg-brand-light text-brand"><Check size={12} className="mr-1" /> przesłano {new Date(sent.at).toLocaleDateString("pl-PL")}</span>
                  ) : (
                    <label className={`btn-ghost cursor-pointer !py-1 text-xs ${uploading === m ? "opacity-60" : ""}`}>
                      {uploading === m ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Prześlij
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" className="hidden" disabled={!!uploading} onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f || !caseId) return;
                        setUploading(m);
                        try { await uploadToCase(f, caseId, m, latest.id); load(); } finally { setUploading(null); }
                      }} />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Przesłane dokumenty trafiają do urzędnika prowadzącego sprawę – po weryfikacji otrzymasz decyzję.</p>
        </div>
      )}

      {!apps.length ? (
        <p className="text-sm text-muted">Nie wysłano jeszcze żadnych wniosków. <Link href="/wnioski" className="font-semibold text-accent">Przejdź do wniosków →</Link></p>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => {
            const st = applicationStatus(a, now, a.to.startsWith("Pracodawca") ? null : latest);
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
      <p className="mt-3 text-xs text-muted">Wnioski do ZUS rozpatruje urzędnik w panelu urzędnika – decyzja pojawi się tutaj automatycznie. Status u pracodawcy jest symulowany.</p>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4 print:static print:bg-white print:p-0" role="dialog" aria-modal>
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex justify-end gap-2 print:hidden">
              <button className="btn-primary !py-1.5 text-sm" onClick={() => window.print()}><Printer size={16} /> Drukuj / PDF</button>
              <button className="btn-ghost !py-1.5 text-sm" onClick={() => setOpen(null)}>Zamknij</button>
            </div>
            <DecisionLetter d={open} person={session.user?.name ?? ""} />
          </div>
        </div>
      )}
    </section>
  );
}

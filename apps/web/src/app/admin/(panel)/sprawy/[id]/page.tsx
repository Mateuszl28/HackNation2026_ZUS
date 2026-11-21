"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Scale, StickyNote, FileText, Gavel, Info, OctagonAlert, Printer, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { DECISION_LABELS, pln, type CalcResult, type DecisionType, type DemoCase, type Recommendation } from "@zus/engine";
import DecisionLetter, { type DecisionDoc } from "@/components/DecisionLetter";
import { useAdmin } from "@/components/admin/AdminContext";

interface Detail {
  case: DemoCase;
  result: CalcResult;
  recommendation: Recommendation;
  applications: { id: string; title: string; to: string; sentAt: number }[];
  decisions: DecisionDoc[];
  notes: { id: string; by: string; at: string; text: string }[];
  appeals: { id: string; decisionId: string; text: string; at: string; status: "pending" | "accepted" | "forwarded"; resolvedBy?: string; resolvedAt?: string; resolution?: string }[];
  checks: { level: "ok" | "warning" | "danger"; text: string; doc?: string }[];
  sla: { days: number; left: number; deadline: string; level: "ok" | "warning" | "danger" } | null;
  documents: { id: string; name: string; fileName?: string; formType?: string; fields?: { label: string; value: string }[]; inResponseTo?: string; at: number }[];
}

const TITLE: Record<string, string> = { employment: "Umowa o pracę", mandate: "Umowa zlecenia", business: "Działalność gospodarcza", none: "Brak ubezpieczenia chorobowego" };
const OPTS: { v: DecisionType; label: string; icon: typeof Check; cls: string }[] = [
  { v: "grant", label: "Przyznać", icon: Check, cls: "border-brand bg-brand-light text-brand" },
  { v: "request", label: "Wezwać do uzupełnienia", icon: FileText, cls: "border-amber-400 bg-amber-50 text-amber-800" },
  { v: "refuse", label: "Odmówić", icon: X, cls: "border-red-400 bg-red-50 text-red-800" },
];

function draftJustification(d: Detail, type: DecisionType) {
  const r = d.recommendation;
  if (type === "grant") return [...r.reasons, `Łączna kwota świadczeń: ${pln(d.result.total)}.`].join("\n");
  if (type === "request") return ["W toku postępowania stwierdzono braki w dokumentacji niezbędnej do ustalenia prawa do zasiłku i jego wysokości.", ...r.reasons.filter((x) => !x.startsWith("Spełnione"))].join("\n");
  return r.reasons.length ? r.reasons.join("\n") : "Wnioskodawca nie spełnia warunków do nabycia prawa do zasiłku.";
}

export default function CaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [type, setType] = useState<DecisionType | null>(null);
  const [just, setJust] = useState("");
  const [docs, setDocs] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<DecisionDoc | null>(null);
  const [note, setNote] = useState("");
  const [appealRes, setAppealRes] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const { role } = useAdmin();

  const load = () =>
    fetch(`/api/admin/cases/${id}`).then(async (r) => {
      if (r.status === 401) return router.replace("/admin/logowanie");
      if (!r.ok) return setErr("Nie znaleziono sprawy");
      const j: Detail = await r.json();
      setD(j);
      setType((t) => t ?? j.recommendation.type);
      setJust((s) => s || draftJustification(j, j.recommendation.type));
      setDocs((x) => (Object.keys(x).length ? x : Object.fromEntries(j.recommendation.missingDocs.map((m) => [m, true]))));
    });
  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <p className="card text-red-700">{err}</p>;
  if (!d || !type) return <div className="card h-60 animate-pulse" />;
  const c = d.case;
  const name = c.title.split(" – ")[0];
  const rec = d.recommendation;

  const choose = (t: DecisionType) => {
    setType(t);
    setJust(draftJustification(d, t));
  };
  const submit = async () => {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/admin/cases/${id}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, justification: just, legalBasis: rec.legalBasis, missingDocs: Object.entries(docs).filter(([, v]) => v).map(([k]) => k) }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(j.error ?? "Błąd zapisu decyzji");
    setIssued(j);
    load();
  };

  return (
    <div className="space-y-6">
      <Link href="/admin/sprawy" className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><ArrowLeft size={16} /> Wszystkie sprawy</Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{name}</h1>
          <p className="text-muted">{c.title.split(" – ")[1]} · {c.input.scenario === "birth" ? "poród" : c.input.scenario === "adoption" ? "adopcja" : "rodzina zastępcza"} {c.input.eventDate} · dzieci: {c.input.children}</p>
        </div>
        {d.sla && <span className={`chip !py-1.5 ${d.sla.level === "danger" ? "bg-red-100 text-red-800" : d.sla.level === "warning" ? "bg-amber-100 text-amber-800" : "bg-slate-100"}`}>Termin załatwienia: {d.sla.deadline} ({d.sla.left < 0 ? `po terminie ${-d.sla.left} dni` : `zostało ${d.sla.left} dni`})</span>}
        {d.decisions[0] && <span className="chip bg-slate-100 !py-1.5">Ostatnia decyzja: {DECISION_LABELS[d.decisions[0].type]} · {new Date(d.decisions[0].at).toLocaleDateString("pl-PL")} · {d.decisions[0].by}</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* ---------- dane ---------- */}
        <div className="min-w-0 space-y-6">
          <section className="card">
            <h2 className="mb-3 flex items-center gap-2"><ShieldCheck size={18} /> Dane z systemów ZUS</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {(["mother", "father"] as const).map((w) => {
                const p = c.input[w];
                const r = d.result[w];
                return (
                  <div key={w} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{w === "mother" ? "Matka / rodzic 1" : "Ojciec / rodzic 2"}</p>
                    <p>{TITLE[p.title]}</p>
                    {p.title !== "none" && <p className="text-muted">ubezp. od {p.insuredSince ?? "—"}{p.insuredUntil ? ` do ${p.insuredUntil}` : ""} · podstawa {pln(r.base)}</p>}
                    <p className={r.eligible ? "text-brand" : "text-red-700"}>{r.eligible ? `✓ prawo do zasiłku · wypłaca ${r.payer === "employer" ? "płatnik" : "ZUS"}` : "✕ brak prawa"}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <p className="label">Okresy ubezpieczenia</p>
                {c.zusData.insurance.length ? c.zusData.insurance.map((i, k) => <p key={k}>{i.title}<span className="block text-xs text-muted">{i.from} – {i.to ?? "obecnie"} · {i.sickness}</span></p>) : <p className="text-muted">brak zgłoszeń</p>}
              </div>
              <div>
                <p className="label">Zadłużenie składkowe</p>
                <p className={`flex items-center gap-1 font-semibold ${c.zusData.debt ? "text-red-700" : "text-brand"}`}><Wallet size={15} /> {pln(c.zusData.debt)}</p>
              </div>
              <div>
                <p className="label">e-ZLA</p>
                {c.zusData.ezla.length ? c.zusData.ezla.map((e, k) => <p key={k}>{e.from} – {e.to} · kod {e.code}</p>) : <p className="text-muted">brak</p>}
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="mb-3">Wnioski złożone przez obywatela</h2>
            {d.applications.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {d.applications.map((a) => <li key={a.id} className="flex justify-between gap-2 py-2"><span>{a.title}</span><span className="font-mono text-xs text-muted">{a.id} · {new Date(a.sentAt).toLocaleString("pl-PL")}</span></li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted">Brak wniosków złożonych elektronicznie (sprawa z dokumentów papierowych / od płatnika).</p>
            )}
          </section>

          <section className="card">
            <h2 className="mb-3 flex items-center gap-2"><FileText size={18} /> Dokumenty w sprawie {d.documents.length > 0 && <span className="chip bg-slate-100">{d.documents.length}</span>}</h2>
            {!d.documents.length ? (
              <p className="text-sm text-muted">Obywatel nie przesłał jeszcze dokumentów elektronicznie.</p>
            ) : (
              <ul className="space-y-3">
                {d.documents.map((doc) => {
                  const fresh = d.decisions[0] && doc.at > new Date(d.decisions[0].at).getTime();
                  return (
                    <li key={doc.id} className={`rounded-xl border p-3 text-sm ${fresh ? "border-amber-300 bg-amber-50/60" : "border-slate-200"}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">{doc.name} {fresh && <span className="chip ml-1 bg-amber-200 text-amber-900">nowy</span>}</p>
                        <span className="font-mono text-xs text-muted">{doc.id} · {new Date(doc.at).toLocaleString("pl-PL")}</span>
                      </div>
                      <p className="text-xs text-muted">{doc.fileName}{doc.formType ? ` · rozpoznano: ${doc.formType}` : ""}{doc.inResponseTo ? ` · odpowiedź na ${doc.inResponseTo}` : ""}</p>
                      {!!doc.fields?.length && (
                        <dl className="mt-2 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                          {doc.fields.map((f) => <div key={f.label} className="flex justify-between gap-2 border-b border-slate-100 py-0.5"><dt className="text-muted">{f.label}</dt><dd className="font-medium">{f.value}</dd></div>)}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {d.checks.length > 0 && (
            <section className="card">
              <h2 className="mb-3 flex items-center gap-2"><ShieldCheck size={18} /> Kontrola krzyżowa dokumentów</h2>
              <ul className="space-y-2 text-sm">
                {d.checks.map((ch, i) => (
                  <li key={i} className={`flex gap-2 rounded-lg p-2 ${ch.level === "danger" ? "bg-red-50 text-red-900" : ch.level === "warning" ? "bg-amber-50 text-amber-900" : "bg-brand-light/60 text-ink"}`}>
                    <span className="shrink-0">{ch.level === "ok" ? "✓" : ch.level === "warning" ? "⚠" : "✕"}</span>
                    <span>{ch.doc && <b>{ch.doc}: </b>}{ch.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Porównanie danych odczytanych z dokumentów z danymi w systemach ZUS (reguły, bez AI).</p>
            </section>
          )}

          <section className="card overflow-x-auto">
            <h2 className="mb-3">Wyliczenie świadczeń</h2>
            <table className="w-full min-w-[560px] text-sm [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
              <thead className="border-b text-left text-muted"><tr><th className="py-2">Okres</th><th>Od – do</th><th className="text-right">%</th><th className="text-right">Mies.</th><th className="text-right">Razem</th></tr></thead>
              <tbody>
                {d.result.periods.map((p, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2">{p.label}</td><td className="whitespace-nowrap">{p.start} – {p.end}</td><td className="text-right">{Math.round(p.rate * 1000) / 10}</td><td className="text-right">{pln(p.monthlyAmount)}</td><td className="text-right font-semibold">{pln(p.total)}</td></tr>)}
                {!d.result.periods.length && <tr><td colSpan={5} className="py-3 text-muted">Brak okresów, za które przysługuje zasiłek.</td></tr>}
              </tbody>
            </table>
            <p className="mt-2 text-right font-bold">Łącznie: {pln(d.result.total)}</p>
          </section>

          {d.result.notices.length > 0 && (
            <section className="space-y-2">
              {d.result.notices.map((n, i) => {
                const Icon = n.level === "danger" ? OctagonAlert : n.level === "warning" ? AlertTriangle : Info;
                return <div key={i} className={`flex gap-2 rounded-xl border p-3 text-sm ${n.level === "danger" ? "border-red-200 bg-red-50" : n.level === "warning" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"}`}><Icon size={16} className="mt-0.5 shrink-0" /><span><b>{n.title}.</b> {n.text}</span></div>;
              })}
            </section>
          )}
        </div>

        {/* ---------- decyzja ---------- */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          {d.decisions.filter((x) => x.status === "pending_approval" || x.status === "returned").slice(0, 1).map((x) => (
            <section key={`appr-${x.id}`} className={`card border-2 ${x.status === "pending_approval" ? "border-violet-300" : "border-amber-300"}`}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-700"><ShieldCheck size={14} /> Zasada dwóch par oczu</p>
              {x.status === "pending_approval" ? (
                <>
                  <p className="font-semibold">Odmowa {x.id} czeka na zatwierdzenie kierownika</p>
                  <p className="text-xs text-muted">Wydał: {x.by} · {new Date(x.at).toLocaleString("pl-PL")}. Obywatel nie widzi decyzji do czasu zatwierdzenia.</p>
                  <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-sm">{x.justification}</p>
                  {role === "manager" ? (
                    <>
                      <textarea className="input mt-2 min-h-16 text-sm" placeholder="Komentarz (wymagany przy zwrocie)…" value={approvalComment} onChange={(e) => setApprovalComment(e.target.value)} />
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(["approve", "return"] as const).map((act) => (
                          <button
                            key={act}
                            className={act === "approve" ? "btn-primary !bg-violet-700 !py-2 text-sm hover:!bg-violet-800" : "btn-ghost !py-2 text-sm"}
                            onClick={async () => {
                              const r = await fetch(`/api/admin/cases/${id}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decisionId: x.id, action: act, comment: approvalComment }) });
                              const j = await r.json().catch(() => ({}));
                              if (!r.ok) return setErr(j.error ?? "Błąd");
                              setApprovalComment("");
                              load();
                            }}
                          >
                            {act === "approve" ? "Zatwierdź i opublikuj" : "Zwróć do poprawy"}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 rounded-lg bg-violet-50 p-2 text-sm text-violet-900">Zaloguj się jako kierownik, aby zatwierdzić lub zwrócić decyzję.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold">Decyzja {x.id} zwrócona do poprawy</p>
                  <p className="text-xs text-muted">{x.approvedBy} · {x.approvedAt && new Date(x.approvedAt).toLocaleString("pl-PL")}</p>
                  <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{x.approvalComment}</p>
                  <p className="mt-1 text-xs text-muted">Popraw uzasadnienie lub rozstrzygnięcie poniżej i wydaj decyzję ponownie.</p>
                </>
              )}
            </section>
          ))}

          {d.appeals.map((a) => (
            <section key={a.id} className={`card border-2 ${a.status === "pending" ? "border-red-300" : "border-slate-200"}`}>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700"><Scale size={14} /> Odwołanie od decyzji {a.decisionId}</p>
              <p className="text-xs text-muted">{a.id} · wpłynęło {new Date(a.at).toLocaleString("pl-PL")}</p>
              <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-2 text-sm">{a.text}</p>
              {a.status === "pending" ? (
                <>
                  <p className="mt-3 text-xs text-muted">Art. 477⁹ KPC: ZUS może uwzględnić odwołanie i zmienić decyzję (samokontrola) albo w ciągu 30 dni przekazać sprawę do sądu ze stanowiskiem.</p>
                  <textarea className="input mt-2 min-h-20 text-sm" placeholder="Uzasadnienie / stanowisko ZUS…" value={appealRes} onChange={(e) => setAppealRes(e.target.value)} />
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(["accept", "forward"] as const).map((act) => (
                      <button
                        key={act}
                        className={act === "accept" ? "btn-primary !py-2 text-sm" : "btn-ghost !py-2 text-sm"}
                        onClick={async () => {
                          const r = await fetch(`/api/admin/cases/${id}/appeal`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appealId: a.id, action: act, resolution: appealRes }) });
                          const j = await r.json().catch(() => ({}));
                          if (!r.ok) return setErr(j.error ?? "Błąd");
                          setAppealRes("");
                          if (act === "accept") {
                            choose("grant");
                            setJust(`Na skutek odwołania ${a.id} – samokontrola (art. 477⁹ § 1 KPC).\n` + draftJustification(d, "grant"));
                          }
                          load();
                        }}
                      >
                        {act === "accept" ? "Uwzględnij – zmień decyzję" : "Przekaż do sądu"}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`mt-2 rounded-lg p-2 text-sm ${a.status === "accepted" ? "bg-brand-light text-brand" : "bg-slate-100"}`}>
                  {a.status === "accepted" ? "Uwzględniono – wydaj nową decyzję poniżej." : "Przekazano do sądu okręgowego (sąd pracy i ubezpieczeń społecznych)."} {a.resolvedBy} · {a.resolvedAt && new Date(a.resolvedAt).toLocaleDateString("pl-PL")}
                  <span className="mt-1 block text-xs text-muted">{a.resolution}</span>
                </p>
              )}
            </section>
          ))}

          <section className="card border-2 border-[#123a5c]/20">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><Sparkles size={14} /> Rekomendacja systemu</p>
            <p className="text-lg font-bold">{DECISION_LABELS[rec.type]}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            {rec.manualChecks.map((m) => <p key={m} className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><AlertTriangle size={14} className="shrink-0" /> {m}</p>)}
            <p className="mt-2 text-xs text-muted">Rekomendacja na podstawie reguł (bez AI). Decyzję podejmuje urzędnik.</p>
          </section>

          <section className="card space-y-4">
            <h2 className="flex items-center gap-2"><Gavel size={18} /> Rozstrzygnięcie</h2>
            <div className="grid gap-2">
              {OPTS.map((o) => (
                <button key={o.v} onClick={() => choose(o.v)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition ${type === o.v ? o.cls : "border-slate-200 hover:border-slate-300"}`} aria-pressed={type === o.v}>
                  <o.icon size={16} /> {o.label}
                  {rec.type === o.v && <span className="ml-auto text-[10px] font-normal uppercase text-muted">rekomendowane</span>}
                </button>
              ))}
            </div>
            {type === "request" && (
              <div>
                <p className="label">Dokumenty do uzupełnienia</p>
                {[...new Set([...rec.missingDocs, "Wniosek ZAM (podpisany)", "Oświadczenie drugiego z rodziców"])].map((m) => (
                  <label key={m} className="flex items-start gap-2 py-1 text-sm"><input type="checkbox" className="mt-1" checked={!!docs[m]} onChange={(e) => setDocs({ ...docs, [m]: e.target.checked })} /> {m}</label>
                ))}
              </div>
            )}
            <label className="block">
              <span className="label">Uzasadnienie</span>
              <textarea className="input min-h-36 text-sm" value={just} onChange={(e) => setJust(e.target.value)} />
            </label>
            <div>
              <p className="label">Podstawa prawna</p>
              <ul className="list-disc pl-5 text-xs text-muted">{rec.legalBasis.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
            {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{err}</p>}
            <button className="btn-primary w-full !bg-[#123a5c] !py-3 hover:!bg-[#0c2740]" disabled={busy} onClick={submit}>
              <Gavel size={18} /> {busy ? "Zapisywanie…" : type === "request" ? "Wyślij wezwanie" : "Wydaj decyzję"}
            </button>
          </section>

          <section className="card">
            <h2 className="mb-1 flex items-center gap-2"><StickyNote size={18} /> Notatki wewnętrzne</h2>
            <p className="mb-3 text-xs text-muted">Widoczne tylko dla pracowników ZUS – nie trafiają do obywatela.</p>
            <ul className="mb-3 space-y-2">
              {d.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-yellow-50 p-2 text-sm">
                  <p className="whitespace-pre-line">{n.text}</p>
                  <p className="mt-1 text-xs text-muted">{n.by} · {new Date(n.at).toLocaleString("pl-PL")}</p>
                </li>
              ))}
              {!d.notes.length && <li className="text-sm text-muted">Brak notatek.</li>}
            </ul>
            <textarea className="input min-h-16 text-sm" placeholder="np. Telefon do płatnika w sprawie Z-3 – oczekuje na korektę…" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-ghost mt-2 w-full !py-2 text-sm" disabled={note.trim().length < 2} onClick={async () => {
              const r = await fetch(`/api/admin/cases/${id}/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: note }) });
              if (r.ok) { setNote(""); load(); }
            }}>Dodaj notatkę</button>
          </section>

          {d.decisions.length > 0 && (
            <section className="card">
              <h2 className="mb-2">Historia rozstrzygnięć</h2>
              <ul className="space-y-2 text-sm">
                {d.decisions.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2">
                    <span><b>{DECISION_LABELS[x.type]}</b>{x.status === "pending_approval" && <span className="chip ml-1 bg-violet-100 text-violet-800">czeka na kierownika</span>}{x.status === "returned" && <span className="chip ml-1 bg-amber-100 text-amber-800">zwrócona</span>}<span className="block text-xs text-muted">{x.id} · {new Date(x.at).toLocaleString("pl-PL")} · {x.by}{x.approvedBy ? ` · zatw. ${x.approvedBy}` : ""}</span></span>
                    <button className="text-xs font-semibold text-accent" onClick={() => setIssued(x)}>pismo</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      {issued && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4 print:static print:bg-white print:p-0" role="dialog" aria-modal>
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex items-center justify-between gap-2 print:hidden">
              <p className="rounded-lg bg-brand-light px-3 py-1.5 text-sm font-semibold text-brand">{issued.status === "pending_approval" ? "✓ Zapisano – odmowa czeka na zatwierdzenie kierownika (obywatel jej jeszcze nie widzi)" : "✓ Zapisano – obywatel widzi pismo na swoim pulpicie"}</p>
              <div className="flex gap-2">
                <button className="btn-primary !py-1.5 text-sm" onClick={() => window.print()}><Printer size={16} /> Drukuj</button>
                <button className="btn-ghost !py-1.5 text-sm" onClick={() => setIssued(null)}>Zamknij</button>
              </div>
            </div>
            <DecisionLetter d={issued} person={name} />
          </div>
        </div>
      )}
    </div>
  );
}

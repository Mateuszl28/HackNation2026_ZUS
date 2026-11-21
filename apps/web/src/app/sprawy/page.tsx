"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, HelpCircle, Upload, XCircle } from "lucide-react";
import { DEMO_CASES, calculate, pln, type ParsedDocument } from "@zus/engine";
import { DEFAULT_INPUT, useParams, useSession } from "@/lib/session";

type Parsed = ParsedDocument & { textPreview?: string; error?: string; fileName?: string; computedBase?: number | null };

export default function Cases() {
  const params = useParams();
  const { update } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<"mother" | "father">("mother");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const out: Parsed[] = [];
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/parse", { method: "POST", body: fd }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
      out.push({ ...r, fileName: f.name });
    }
    setDocs((d) => [...out, ...d]);
    setBusy(false);
  };

  const useDoc = (d: Parsed) => {
    const base = DEFAULT_INPUT;
    const parent = { ...base[who], title: d.insured === false ? ("none" as const) : d.title ?? base[who].title, monthlyBase: d.computedBase ?? d.monthlyBase ?? base[who].monthlyBase, insuredSince: d.insuredSince, insuredUntil: d.insuredUntil, baseAlreadyNet: !!d.computedBase || /Z-3/.test(d.formType) };
    update({ input: { ...base, eventDate: d.eventDate ?? base.eventDate, [who]: parent } });
    router.push("/kalkulator");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1>Sprawy i dokumenty</h1>
        <p className="text-muted">Wybierz przykładową sprawę lub wgraj własny dokument (Z-3, Z-3a, ZAM, poświadczenie ubezpieczenia) – sprawdzimy ubezpieczenie i policzymy zasiłek.</p>
      </div>

      <section className="card space-y-4">
        <h2>Wgraj dokument (PDF)</h2>
        <label className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition ${busy ? "opacity-60" : "hover:border-brand hover:bg-brand-light/40"} border-slate-300`}>
          <Upload className="text-brand" />
          <span className="font-semibold">{busy ? "Odczytuję…" : "Kliknij lub upuść pliki PDF"}</span>
          <span className="text-xs text-muted">Pliki są przetwarzane w pamięci i nie są zapisywane.</span>
          <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={(e) => upload(e.target.files)} disabled={busy} />
        </label>
        <div className="flex items-center gap-2 text-sm">
          Dane z dokumentu przypisz do:
          <select className="input !w-auto !py-1" value={who} onChange={(e) => setWho(e.target.value as "mother" | "father")}><option value="mother">matki</option><option value="father">ojca</option></select>
        </div>
        {docs.map((d, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <p className="font-semibold">{d.fileName} <span className="text-muted font-normal">· {d.formType ?? "—"}</span></p>
              {d.error ? <span className="chip bg-red-100 text-red-800">błąd</span> : d.insured === true ? <span className="chip bg-brand-light text-brand"><CheckCircle2 size={14} className="mr-1" />ubezpieczenie chorobowe</span> : d.insured === false ? <span className="chip bg-red-100 text-red-800"><XCircle size={14} className="mr-1" />brak ubezpieczenia</span> : <span className="chip bg-amber-100 text-amber-800"><HelpCircle size={14} className="mr-1" />do weryfikacji</span>}
            </div>
            {d.error && <p className="text-sm text-red-700">{d.error}</p>}
            {d.fields?.length > 0 && (
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {d.fields.map((f) => <div key={f.label} className="flex justify-between gap-2 border-b border-slate-100 py-1"><dt className="text-muted">{f.label}</dt><dd className="font-medium text-right">{f.value}</dd></div>)}
              </dl>
            )}
            {d.warnings?.map((w) => <p key={w} className="text-xs text-amber-700">⚠ {w}</p>)}
            {d.confidence !== undefined && <p className="text-xs text-muted">Pewność odczytu: {Math.round(d.confidence * 100)}%</p>}
            {!d.error && <button className="btn-primary text-sm" onClick={() => useDoc(d)}>Przelicz w kalkulatorze</button>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2>Sprawy demonstracyjne</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_CASES.map((c) => {
            const r = calculate(c.input, params);
            const ok = r.mother.eligible || r.father.eligible;
            return (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span className={`chip h-fit ${r.mother.eligible ? "bg-brand-light text-brand" : "bg-red-100 text-red-800"}`}>{r.mother.eligible ? "przyznano" : "odmowa (matka)"}</span>
                </div>
                <p className="text-sm text-muted">{c.description}</p>
                <p className="text-sm"><b>Oczekiwany wynik:</b> {c.expected}</p>
                <p className="text-sm"><b>Wynik narzędzia:</b> {ok ? pln(r.total) : "brak prawa do zasiłku"} · {r.periods.length} okresów</p>
                <button className="btn-ghost text-sm mt-auto" onClick={() => { update({ input: c.input }); router.push("/kalkulator"); }}>Otwórz w kalkulatorze</button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

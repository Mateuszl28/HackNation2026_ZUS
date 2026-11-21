"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileStack, HelpCircle, Upload, XCircle } from "lucide-react";
import { pln, type DossierProfile } from "@zus/engine";
import { useSession } from "@/lib/session";

type Result = DossierProfile & { scans?: string[]; error?: string };
const TITLE: Record<string, string> = { employment: "Umowa o pracę", mandate: "Umowa zlecenia", business: "Działalność gospodarcza" };
const OUT: Record<string, string> = { granted: "przyznano", refused: "odmowa", unknown: "brak rozstrzygnięcia" };

/** Analiza zestawu dokumentów sprawy (np. przykładowy zestaw ZUS): ubezpieczenie, podstawa, wyliczenie i porównanie z decyzją ZUS. */
export default function DossierPanel() {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<Result | null>(null);
  const [names, setNames] = useState<string[]>([]);

  const analyze = async (list: FileList | null) => {
    if (!list?.length) return;
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append("files", f));
    setNames(Array.from(list).map((f) => f.name));
    setBusy(true);
    const res = await fetch("/api/dossier", { method: "POST", body: fd }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    setR(res);
    setBusy(false);
  };

  const Verdict = ({ v }: { v: "granted" | "refused" | "unknown" | null }) =>
    v === "granted" ? <CheckCircle2 className="text-brand" /> : v === "refused" ? <XCircle className="text-red-600" /> : <HelpCircle className="text-amber-600" />;

  return (
    <section className="card space-y-4 border-2 border-brand/30">
      <div>
        <h2 className="flex items-center gap-2"><FileStack className="text-brand" /> Analiza zestawu dokumentów sprawy</h2>
        <p className="text-sm text-muted">Wgraj naraz wszystkie dokumenty jednej sprawy (np. przykładowy zestaw ZUS: Z-3/Z-3a, ZAM, poświadczenie ubezpieczenia, zrzut z systemu, e-ZLA). Ustalimy, czy osoba była ubezpieczona w dniu porodu, policzymy zasiłek i porównamy wynik z rozstrzygnięciem ZUS z zestawu.</p>
      </div>
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 p-6 transition ${busy ? "opacity-60" : "hover:bg-brand-light/40"}`}>
        <Upload className="text-brand" />
        <span className="font-semibold">{busy ? "Analizuję zestaw…" : "Wybierz kilka plików PDF jednej sprawy"}</span>
        <span className="text-xs text-muted">Pliki są przetwarzane w pamięci i nie są zapisywane.</span>
        <input type="file" multiple accept=".pdf,.txt" className="hidden" disabled={busy} onChange={(e) => analyze(e.target.files)} />
      </label>

      {r?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{r.error}</p>}
      {r && !r.error && (
        <div className="space-y-4">
          <p className="text-xs text-muted">Pliki: {names.join(", ")}{r.scans?.length ? ` · bez warstwy tekstowej (skany): ${r.scans.join(", ")}` : ""}</p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className={`rounded-2xl border-2 p-4 ${r.insuredOnEvent === true ? "border-brand/40 bg-brand-light/50" : r.insuredOnEvent === false ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="flex items-center gap-2 font-semibold"><Verdict v={r.insuredOnEvent === true ? "granted" : r.insuredOnEvent === false ? "refused" : null} /> Ubezpieczenie chorobowe w dniu porodu</p>
              <p className="mt-1 text-2xl font-bold">{r.insuredOnEvent === true ? "TAK" : r.insuredOnEvent === false ? "NIE" : "?"}</p>
              <p className="text-xs text-muted">{r.insuredReason}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold">Wynik narzędzia</p>
              <p className="mt-1 text-2xl font-bold">{r.verdict === "granted" && r.result ? pln(r.result.total) : OUT[r.verdict]}</p>
              <p className="text-xs text-muted">{r.verdict === "granted" ? "prawo do zasiłku macierzyńskiego" : r.verdict === "refused" ? "brak prawa do zasiłku" : "za mało danych"}</p>
            </div>
            <div className={`rounded-2xl border-2 p-4 ${r.agreement === true ? "border-brand/40 bg-brand-light/50" : r.agreement === false ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
              <p className="font-semibold">Rozstrzygnięcie ZUS w zestawie</p>
              <p className="mt-1 text-2xl font-bold">{r.zusOutcome ? OUT[r.zusOutcome] : "—"}</p>
              <p className="text-xs text-muted">{r.agreement === true ? "✓ wynik narzędzia zgodny z decyzją ZUS" : r.agreement === false ? "✕ rozbieżność – sprawdź szczegóły" : r.zusOutcome ? "nie można porównać" : "brak dokumentu z rozstrzygnięciem"}{r.zusOutcomeSource ? ` (${r.zusOutcomeSource})` : ""}</p>
            </div>
          </div>

          <dl className="grid gap-x-6 gap-y-1 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
            {[
              ["Tytuł ubezpieczenia", r.title ? TITLE[r.title] : "—"],
              ["Data porodu", r.eventDate ?? "—"],
              ["Podstawa wymiaru", r.monthlyBase ? `${pln(r.monthlyBase)}${r.baseIsNet ? "" : " (brutto – odliczymy 13,71%)"}` : "—"],
              ["Źródło podstawy", r.baseSource ?? "—"],
              ["Okresy ubezpieczenia", r.periods.length ? r.periods.map((p) => `${p.from} – ${p.to ?? "nadal"}`).join("; ") : "—"],
              ["e-ZLA z kodem „B” (ciąża)", r.codeB ? "tak" : "nie wykryto"],
            ].map(([k, v]) => <div key={k} className="flex justify-between gap-2 border-b border-slate-200 py-1"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
          </dl>
          {r.missing.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Brakuje: {r.missing.join(", ")}. Uzupełnij dane w kalkulatorze.</p>}

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-accent">Szczegóły odczytu każdego dokumentu ({r.docs.length})</summary>
            <ul className="mt-2 space-y-2">
              {r.docs.map((d) => (
                <li key={d.name} className="rounded-lg border border-slate-200 p-2">
                  <p className="font-medium">{d.name} <span className="font-normal text-muted">· {d.formType}{d.outcome ? ` · rozstrzygnięcie: ${OUT[d.outcome]}` : ""}{d.codeB ? " · kod B" : ""}</span></p>
                  <p className="text-xs text-muted">{d.fields.map((f) => `${f.label}: ${f.value}`).join(" · ") || "brak odczytanych pól"}</p>
                </li>
              ))}
            </ul>
          </details>

          {r.input && (
            <button className="btn-primary" onClick={() => { update({ input: r.input! }); router.push("/kalkulator"); }}>Otwórz w kalkulatorze i dopasuj plan</button>
          )}
        </div>
      )}
    </section>
  );
}

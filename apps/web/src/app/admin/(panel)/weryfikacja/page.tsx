"use client";
import { Fragment, useRef, useState } from "react";
import { CheckCircle2, Download, FileArchive, FolderOpen, HelpCircle, XCircle } from "lucide-react";
import { pln } from "@zus/engine";

type Row = {
  case: string; files: string[]; ocr: number; title: string | null; eventDate: string | null; monthlyBase: number | null;
  insuredOnEvent: boolean | null; insuredReason: string; verdict: "granted" | "refused" | "unknown"; total: number | null;
  zusOutcome: "granted" | "refused" | null; agreement: boolean | null; missing: string[];
};
type Res = { rows: Row[]; summary: { cases: number; compared: number; agreed: number; disagreed: number; noZus: number; rate: number | null }; error?: string };

const OUT: Record<string, string> = { granted: "przyznano", refused: "odmowa", unknown: "za mało danych" };
const TITLE: Record<string, string> = { employment: "umowa o pracę", mandate: "zlecenie", business: "działalność" };

/** Zbiorcza weryfikacja: wiele spraw naraz, porównanie wyniku narzędzia z rozstrzygnięciem ZUS. */
export default function BatchPage() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "bad" | "nozus">("all");
  const dirRef = useRef<HTMLInputElement>(null);

  const send = async (list: FileList | null) => {
    if (!list?.length) return;
    const fd = new FormData();
    // ścieżka względna (wybór folderu) w nazwie pliku – serwer grupuje po podfolderach
    for (const f of Array.from(list)) fd.append("files", f, (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
    setBusy(true);
    setRes(null);
    const r = await fetch("/api/admin/batch", { method: "POST", body: fd }).then((x) => x.json()).catch((e) => ({ error: String(e) }));
    setRes(r);
    setBusy(false);
  };

  const exportCsv = () => {
    if (!res?.rows) return;
    const rows = [["sprawa", "pliki", "tytuł", "data porodu", "podstawa", "ubezpieczona w dniu porodu", "wynik narzędzia", "kwota", "rozstrzygnięcie ZUS", "zgodność", "braki"],
      ...res.rows.map((r) => [r.case, r.files.join(" | "), r.title ?? "", r.eventDate ?? "", r.monthlyBase ?? "", r.insuredOnEvent === null ? "?" : r.insuredOnEvent ? "tak" : "nie", OUT[r.verdict], r.total ?? "", r.zusOutcome ? OUT[r.zusOutcome] : "", r.agreement === null ? "" : r.agreement ? "zgodne" : "ROZBIEŻNOŚĆ", r.missing.join(", ")])];
    const csv = "﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `weryfikacja-spraw-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const rows = (res?.rows ?? []).filter((r) => filter === "all" || (filter === "bad" ? r.agreement === false : !r.zusOutcome));
  const s = res?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1>Zbiorcza weryfikacja spraw</h1>
        <p className="text-muted">Wskaż folder, w którym każdy podfolder to jedna sprawa (np. przykładowe zestawy ZUS), albo archiwa ZIP (jedno archiwum = jedna sprawa). Narzędzie ustali ubezpieczenie w dniu porodu, wyliczy zasiłek i porówna wynik z rozstrzygnięciem ZUS z zestawu.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`card flex cursor-pointer items-center gap-3 border-2 border-dashed border-brand/40 ${busy ? "opacity-60" : "hover:bg-brand-light/40"}`}>
          <FolderOpen className="text-brand" />
          <span><span className="block font-semibold">Wybierz folder ze sprawami</span><span className="text-xs text-muted">podfolder = sprawa · PDF, skany, zdjęcia, TXT</span></span>
          <input ref={(el) => { dirRef.current = el; el?.setAttribute("webkitdirectory", ""); }} type="file" multiple className="hidden" disabled={busy} onChange={(e) => send(e.target.files)} />
        </label>
        <label className={`card flex cursor-pointer items-center gap-3 border-2 border-dashed border-brand/40 ${busy ? "opacity-60" : "hover:bg-brand-light/40"}`}>
          <FileArchive className="text-brand" />
          <span><span className="block font-semibold">Wybierz archiwa ZIP</span><span className="text-xs text-muted">jedno archiwum = jedna sprawa (lub podfoldery w archiwum)</span></span>
          <input type="file" multiple accept=".zip" className="hidden" disabled={busy} onChange={(e) => send(e.target.files)} />
        </label>
      </div>
      {busy && <p className="card text-sm" aria-live="polite">Analizuję sprawy… skany i zdjęcia rozpoznaje OCR, przy wielu plikach może to potrwać kilka minut.</p>}
      {res?.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{res.error}</p>}

      {s && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="card"><p className="text-sm text-muted">Zgodność z ZUS</p><p className="text-3xl font-bold">{s.rate === null ? "—" : `${s.rate.toLocaleString("pl-PL")}%`}</p><p className="text-xs text-muted">{s.agreed} z {s.compared} porównanych spraw</p></div>
            <div className="card"><p className="text-sm text-muted">Sprawy</p><p className="text-3xl font-bold">{s.cases}</p></div>
            <div className="card"><p className="text-sm text-muted">Rozbieżności</p><p className={`text-3xl font-bold ${s.disagreed ? "text-red-700" : ""}`}>{s.disagreed}</p><p className="text-xs text-muted">do ręcznej analizy</p></div>
            <div className="card"><p className="text-sm text-muted">Bez rozstrzygnięcia ZUS</p><p className="text-3xl font-bold">{s.noZus}</p><p className="text-xs text-muted">nie da się porównać</p></div>
          </div>

          <div className="card space-y-3 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1 text-sm" role="tablist">
                {([["all", "Wszystkie"], ["bad", "Rozbieżności"], ["nozus", "Bez decyzji ZUS"]] as const).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 ${filter === k ? "bg-brand text-white" : "bg-slate-100"}`}>{l}</button>
                ))}
              </div>
              <button className="btn-ghost !py-1.5 text-sm" onClick={exportCsv}><Download size={15} /> Eksport CSV</button>
            </div>
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="border-b text-left text-muted"><th className="py-2">Sprawa</th><th>Tytuł</th><th>Poród</th><th>Ubezpieczona</th><th>Wynik narzędzia</th><th>ZUS</th><th>Zgodność</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.case}>
                    <tr className="cursor-pointer border-b hover:bg-slate-50" onClick={() => setOpen(open === r.case ? null : r.case)}>
                      <td className="py-2 font-medium">{r.case} <span className="text-xs font-normal text-muted">({r.files.length} pl.{r.ocr ? `, OCR ${r.ocr}` : ""})</span></td>
                      <td>{r.title ? TITLE[r.title] : "—"}</td>
                      <td>{r.eventDate ?? "—"}</td>
                      <td>{r.insuredOnEvent === null ? "?" : r.insuredOnEvent ? "tak" : "nie"}</td>
                      <td>{r.verdict === "granted" && r.total ? pln(r.total) : OUT[r.verdict]}</td>
                      <td>{r.zusOutcome ? OUT[r.zusOutcome] : "—"}</td>
                      <td>{r.agreement === true ? <span className="inline-flex items-center gap-1 text-brand"><CheckCircle2 size={16} /> zgodne</span> : r.agreement === false ? <span className="inline-flex items-center gap-1 font-semibold text-red-700"><XCircle size={16} /> rozbieżność</span> : <span className="inline-flex items-center gap-1 text-amber-700"><HelpCircle size={16} /> brak porównania</span>}</td>
                    </tr>
                    {open === r.case && (
                      <tr className="border-b bg-slate-50"><td colSpan={7} className="p-3 text-xs">
                        <p><b>Uzasadnienie:</b> {r.insuredReason}</p>
                        {r.monthlyBase && <p><b>Podstawa:</b> {pln(r.monthlyBase)}</p>}
                        {r.missing.length > 0 && <p><b>Brakuje:</b> {r.missing.join(", ")}</p>}
                        <p><b>Pliki:</b> {r.files.join(", ")}</p>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="text-sm text-muted">Brak spraw w tym widoku.</p>}
          </div>
        </>
      )}
    </div>
  );
}

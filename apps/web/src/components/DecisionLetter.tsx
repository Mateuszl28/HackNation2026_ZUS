"use client";
import { DECISION_LABELS, pln, type DecisionType } from "@zus/engine";

export interface DecisionDoc {
  id: string;
  type: DecisionType;
  by: string;
  at: string;
  justification: string;
  legalBasis: string[];
  missingDocs?: string[];
  benefit?: { who: string; label: string; from: string; to: string; monthly: number; total: number }[];
  total?: number;
  status?: "published" | "pending_approval" | "returned";
  approvedBy?: string;
  approvedAt?: string;
  approvalComment?: string;
}

const fmtPL = (iso: string) => new Date(iso).toLocaleDateString("pl-PL");

/** Pismo decyzji / wezwania – wersja do wydruku (wzór poglądowy). */
export default function DecisionLetter({ d, person }: { d: DecisionDoc; person: string }) {
  const isRequest = d.type === "request";
  return (
    <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 font-serif text-[15px] leading-relaxed sm:p-10">
      <div className="flex justify-between text-sm">
        <div>
          <p className="font-bold">Zakład Ubezpieczeń Społecznych</p>
          <p className="text-slate-500">Oddział – Wydział Zasiłków (demo)</p>
        </div>
        <p>dnia {fmtPL(d.at)} r.</p>
      </div>
      <p className="text-sm">Znak sprawy: <b>{d.id}</b></p>
      <p className="text-sm">Adresat: <b>{person}</b></p>
      <h2 className="text-center !text-lg font-bold uppercase tracking-wide">{isRequest ? "Wezwanie do uzupełnienia" : "Decyzja"}</h2>
      {!isRequest && <p className="text-center font-semibold">{DECISION_LABELS[d.type]}</p>}
      <p>
        {isRequest ? "Na podstawie " : "Na podstawie "}
        {d.legalBasis.join("; ")}
        {isRequest ? " wzywa się do uzupełnienia dokumentów w terminie 7 dni od dnia doręczenia:" : d.type === "grant" ? " Zakład Ubezpieczeń Społecznych przyznaje prawo do zasiłku:" : " Zakład Ubezpieczeń Społecznych odmawia prawa do zasiłku."}
      </p>
      {isRequest && d.missingDocs?.length ? (
        <ol className="list-decimal pl-6">{d.missingDocs.map((m) => <li key={m}>{m}</li>)}</ol>
      ) : null}
      {d.type === "grant" && d.benefit?.length ? (
        <table className="w-full text-sm">
          <thead className="border-b text-left"><tr><th className="py-1">Okres</th><th>Od – do</th><th className="text-right">Miesięcznie</th><th className="text-right">Razem</th></tr></thead>
          <tbody>
            {d.benefit.map((b, i) => (
              <tr key={i} className="border-b border-slate-100"><td className="py-1">{b.label}</td><td>{b.from} – {b.to}</td><td className="text-right">{pln(b.monthly)}</td><td className="text-right">{pln(b.total)}</td></tr>
            ))}
            <tr className="font-bold"><td className="py-1" colSpan={3}>Łącznie</td><td className="text-right">{pln(d.total ?? 0)}</td></tr>
          </tbody>
        </table>
      ) : null}
      <div>
        <p className="font-bold">Uzasadnienie</p>
        <p className="whitespace-pre-line">{d.justification}</p>
      </div>
      {!isRequest && <p className="text-sm">Pouczenie: od decyzji przysługuje odwołanie do sądu okręgowego – sądu pracy i ubezpieczeń społecznych, w terminie miesiąca od dnia jej doręczenia, za pośrednictwem ZUS.</p>}
      <div className="flex justify-end pt-6 text-center text-sm">
        <div><p>{d.by}</p><p className="border-t border-dotted border-slate-400 pt-1 text-xs text-slate-500">upoważniony pracownik ZUS (podpis elektroniczny)</p></div>
      </div>
      <p className="border-t pt-2 text-xs text-slate-500">Dokument wygenerowany w środowisku demonstracyjnym HackNation 2026 – wzór poglądowy.</p>
    </article>
  );
}

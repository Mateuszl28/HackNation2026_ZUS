"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, OctagonAlert, Plus, RotateCcw, Trash2 } from "lucide-react";
import { addDays, defaultParentalParts, diffDays, planParental, pln, type CalcInput, type ParentalPart, type Params } from "@zus/engine";

const WHO_COLOR = { mother: "bg-teal-600", father: "bg-indigo-500" } as const;

/** Planer części urlopu rodzicielskiego: podział między rodziców, części naprzemienne/jednoczesne, praca do 1/2 etatu. */
export default function ParentalPlanner({ input, params }: { input: CalcInput; params: Params }) {
  const [parts, setParts] = useState<ParentalPart[]>(() => defaultParentalParts(input, params));
  const key = `${input.eventDate}|${input.children}|${input.zaZyciem}|${input.mother.title}|${input.father.title}|${input.scenario}`;
  useEffect(() => setParts(defaultParentalParts(input, params)), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = useMemo(() => planParental(input, parts, params), [input, parts, params]);
  const set = (i: number, p: Partial<ParentalPart>) => setParts((ps) => ps.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const last = parts.reduce((m, p) => (p.start > m ? p.start : m), parts[0]?.start ?? input.eventDate);
  const add = () => setParts((ps) => [...ps, { who: ps.at(-1)?.who === "mother" ? "father" : "mother", start: addDays(last, 7 * Math.max(...ps.map((x) => x.weeks), 4)), weeks: 4 }]);

  const span = useMemo(() => {
    if (!r.periods.length) return null;
    const from = r.periods.reduce((m, p) => (p.start < m ? p.start : m), r.periods[0].start);
    const to = r.periods.reduce((m, p) => (p.end > m ? p.end : m), r.periods[0].end);
    return { from, to, days: diffDays(from, to) + 1 };
  }, [r.periods]);

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2>Podział urlopu rodzicielskiego</h2>
            <p className="text-sm text-muted">Pula {r.pool} tyg. dla obojga · każdy rodzic ma {params.parentalNonTransferableWeeks} tyg. na wyłączność · maks. {params.parentalMaxParts} części · do {r.deadline}. Części mogą być naprzemienne lub jednoczesne.</p>
          </div>
          <button className="btn-ghost !py-1.5 text-sm" onClick={() => setParts(defaultParentalParts(input, params))}><RotateCcw size={15} /> Domyślny podział</button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
          {([["Mama", r.used.mother, "bg-teal-600"], ["Tata", r.used.father, "bg-indigo-500"], ["Wolne", Math.max(0, r.pool - r.used.total), "bg-slate-300"]] as const).map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-2"><p className="flex items-center justify-center gap-1.5 text-xs text-muted"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{l}</p><p className="text-lg font-bold tabular-nums">{v} tyg.</p></div>
          ))}
        </div>
        <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="bg-teal-600" style={{ width: `${Math.min(100, (r.used.mother / r.pool) * 100)}%` }} />
          <div className="bg-indigo-500" style={{ width: `${Math.min(100, (r.used.father / r.pool) * 100)}%` }} />
        </div>

        <div className="space-y-2">
          {parts.map((p, i) => (
            <div key={i} className="grid items-end gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[auto_1fr_1fr_1fr_1fr_auto]">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white ${WHO_COLOR[p.who]}`}>{i + 1}</span>
              <label className="block"><span className="label">Kto</span><select className="input !py-1.5" value={p.who} onChange={(e) => set(i, { who: e.target.value as ParentalPart["who"] })}><option value="mother">Mama</option><option value="father">Tata</option></select></label>
              <label className="block"><span className="label">Od</span><input type="date" className="input !py-1.5" value={p.start} onChange={(e) => set(i, { start: e.target.value })} /></label>
              <label className="block"><span className="label">Tygodni urlopu</span><input type="number" min={1} max={r.pool} className="input !py-1.5" value={p.weeks} onChange={(e) => set(i, { weeks: Math.max(0, +e.target.value) })} /></label>
              <label className="block"><span className="label">Praca w tym czasie</span><select className="input !py-1.5" value={p.workFraction ?? 0} onChange={(e) => set(i, { workFraction: +e.target.value || undefined })}><option value={0}>nie</option><option value={0.25}>1/4 etatu</option><option value={0.5}>1/2 etatu</option></select></label>
              <button className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" onClick={() => setParts((ps) => ps.filter((_, k) => k !== i))} aria-label={`Usuń część ${i + 1}`}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <button className="btn-ghost mt-3 !py-1.5 text-sm" onClick={add} disabled={parts.length >= params.parentalMaxParts}><Plus size={15} /> Dodaj część ({parts.length}/{params.parentalMaxParts})</button>
      </section>

      {span && (
        <section className="card">
          <h3 className="mb-3 font-semibold">Oś czasu</h3>
          {(["mother", "father"] as const).map((w) => (
            <div key={w} className="mb-2 flex items-center gap-2">
              <span className="w-12 text-xs font-semibold text-muted">{w === "mother" ? "Mama" : "Tata"}</span>
              <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-slate-100">
                {r.periods.filter((p) => p.who === w).map((p, k) => (
                  <div key={k} title={`${p.label}: ${p.start} – ${p.end}`} className={`absolute top-0 grid h-full place-items-center border-r-2 border-white text-[11px] font-semibold text-white ${WHO_COLOR[w]} ${p.rate < 0.6 ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,.25)_6px,rgba(255,255,255,.25)_12px)]" : ""}`} style={{ left: `${(diffDays(span.from, p.start) / span.days) * 100}%`, width: `${(p.days / span.days) * 100}%` }}>
                    {p.days > span.days * 0.06 ? `${p.weeks} tyg.` : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-between pl-14 text-xs text-muted"><span>{span.from}</span><span>{span.to}</span></div>
          <p className="mt-2 text-xs text-muted">Kreskowanie = część łączona z pracą (urlop dłuższy, zasiłek proporcjonalnie niższy).</p>
        </section>
      )}

      {[...r.errors, ...r.warnings].map((n, i) => {
        const Icon = n.level === "danger" ? OctagonAlert : n.level === "warning" ? AlertTriangle : Info;
        return <div key={i} className={`flex gap-3 rounded-xl border p-3 text-sm ${n.level === "danger" ? "border-red-200 bg-red-50 text-red-900" : n.level === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}><Icon size={18} className="mt-0.5 shrink-0" /><span><b>{n.title}.</b> {n.text}</span></div>;
      })}

      <section className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm [&_td]:px-2 [&_th]:px-2 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0">
          <thead className="border-b text-left text-muted"><tr><th className="py-2">Część</th><th>Od – do</th><th className="text-right">%</th><th className="text-right">Miesięcznie</th><th className="text-right">Razem</th><th className="text-right">Wniosek do</th></tr></thead>
          <tbody>
            {r.periods.map((p, i) => (
              <tr key={i} className="border-b border-slate-100 align-top">
                <td className="py-2">{p.label}{p.note && <span className="block text-xs text-muted">{p.note}</span>}</td>
                <td className="whitespace-nowrap">{p.start} – {p.end}</td>
                <td className="text-right">{Math.round(p.rate * 1000) / 10}</td>
                <td className="whitespace-nowrap text-right">{pln(p.monthlyAmount)}</td>
                <td className="whitespace-nowrap text-right font-semibold">{pln(p.total)}</td>
                <td className="whitespace-nowrap text-right text-xs">{addDays(p.start, -21)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-right font-bold">Zasiłek za urlop rodzicielski: {pln(r.total)}</p>
      </section>
    </div>
  );
}

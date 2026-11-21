"use client";
import { useMemo } from "react";
import { Calculator, Scale } from "lucide-react";
import { explainCalculation, pln, type CalcInput, type CalcResult, type Params } from "@zus/engine";

/** „Jak to policzyliśmy” – obliczenie krok po kroku z podstawą prawną (rodzic może sprawdzić decyzję ZUS, urzędnik – wyliczenie). */
export default function ExplainPanel({ input, result, params, open = false }: { input: CalcInput; result: CalcResult; params: Params; open?: boolean }) {
  const sections = useMemo(() => explainCalculation(input, result, params), [input, result, params]);
  if (!sections.length) return null;
  return (
    <details className="card group" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <h2 className="flex items-center gap-2"><Calculator className="text-accent" /> Jak to policzyliśmy</h2>
        <span className="text-sm font-semibold text-accent group-open:hidden">Pokaż obliczenie krok po kroku</span>
      </summary>
      <p className="mt-2 text-sm text-muted">Każdy krok z działaniem i przepisem – możesz porównać go z decyzją ZUS albo z wyliczeniem pracodawcy.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <div key={s.who} className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 flex items-center justify-between font-semibold"><span>{s.title}</span><span className="text-brand">{pln(s.total)}</span></p>
            <ol className="space-y-2 text-sm">
              {s.steps.map((st, i) => (
                <li key={i} className={`flex gap-3 ${i === s.steps.length - 1 ? "border-t border-slate-200 pt-2 font-semibold" : ""}`}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap justify-between gap-x-3"><span>{st.label}</span><span className="font-semibold tabular-nums">{st.value}</span></span>
                    {st.formula && <span className="block font-mono text-xs text-muted">{st.formula}</span>}
                    {st.legal && <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-accent"><Scale size={11} /> {st.legal}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
}

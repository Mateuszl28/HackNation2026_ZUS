"use client";
import { useMemo, useState } from "react";
import { Calculator, Check, X } from "lucide-react";
import { baseFromMonths, last12Months, pln, type MonthWage } from "@zus/engine";
import { useParams } from "@/lib/session";

const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const label = (m: string) => `${MONTHS_PL[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

/** Panel: podstawa wymiaru z 12 miesięcy (jak w Z-3). onApply dostaje podstawę po odliczeniu 13,71%. */
export default function BaseCalculator({ eventDate, initialGross, onApply, onClose }: { eventDate: string; initialGross: number; onApply: (base: number) => void; onClose: () => void }) {
  const params = useParams();
  const [rows, setRows] = useState<MonthWage[]>(() => last12Months(eventDate, initialGross || 7000));
  const r = useMemo(() => baseFromMonths(rows, params), [rows, params]);
  const set = (i: number, p: Partial<MonthWage>) => setRows((rs) => rs.map((x, k) => (k === i ? { ...x, ...p } : x)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2"><Calculator className="text-brand" size={20} /> Podstawa wymiaru z 12 miesięcy</h2>
            <p className="text-sm text-muted">Przepisz przychody z zaświadczenia Z-3 / pasków. Miesiące z nieobecnością (np. L4) uzupełniamy lub pomijamy zgodnie z art. 36–38 ustawy zasiłkowej.</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100" aria-label="Zamknij"><X size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1">Miesiąc</th><th>Przychód brutto</th><th>Dni przepr. / wymagane</th><th>Do podstawy</th></tr></thead>
            <tbody>
              {rows.map((m, i) => {
                const s = r.steps[i];
                return (
                  <tr key={m.month} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 font-medium">{label(m.month)}</td>
                    <td className="pr-2"><input type="number" step={10} className="input !py-1" value={m.gross} onChange={(e) => set(i, { gross: +e.target.value })} /></td>
                    <td className="pr-2">
                      <div className="flex items-center gap-1">
                        <input type="number" className="input !w-16 !py-1" value={m.workedDays ?? 0} onChange={(e) => set(i, { workedDays: +e.target.value })} />
                        <span className="text-muted">/</span>
                        <input type="number" className="input !w-16 !py-1" value={m.requiredDays ?? 0} onChange={(e) => set(i, { requiredDays: +e.target.value })} />
                      </div>
                    </td>
                    <td title={s.note} className={s.status === "excluded" ? "text-red-600 line-through" : s.status === "supplemented" ? "text-amber-700" : ""}>
                      {s.status === "excluded" ? "pominięty" : pln(s.counted)}
                      {s.status === "supplemented" && <span className="block text-[10px]">uzupełniony</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 grid gap-1 rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between"><dt>Średnia z {r.monthsCounted} mies.</dt><dd className="font-medium">{pln(r.average)}</dd></div>
          <div className="flex justify-between"><dt>− składki ubezpieczonego ({(params.socialContributionEmployeeRate * 100).toLocaleString("pl-PL")}%)</dt><dd className="font-medium">−{pln(r.contributions)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base"><dt className="font-semibold">Podstawa wymiaru zasiłku</dt><dd className="font-bold text-brand">{pln(r.base)}</dd></div>
          <div className="flex justify-between text-muted"><dt>Stawka dzienna (podstawa ÷ 30)</dt><dd>{pln(r.daily)}</dd></div>
        </dl>
        {r.warnings.map((w) => <p key={w} className="mt-2 text-xs text-amber-700">⚠ {w}</p>)}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Anuluj</button>
          <button className="btn-primary" onClick={() => onApply(r.base)} disabled={!r.base}><Check size={16} /> Użyj tej podstawy</button>
        </div>
      </div>
    </div>
  );
}

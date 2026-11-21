"use client";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

interface Stats {
  since: string;
  plans: number;
  questions: number;
  intents: Record<string, number>;
  risks: Record<string, number>;
  scenarios: Record<string, number>;
  titles: Record<string, number>;
}

const INTENT_LABELS: Record<string, string> = {
  ile: "Ile wyniesie zasiłek", "815": "Wariant 81,5%", ojciec: "Uprawnienia ojca", dzialalnosc: "Działalność / składki", zlecenie: "Umowa zlecenia",
  l4: "L4 w ciąży", wczesniak: "Wcześniak / szpital", strata: "Strata dziecka", adopcja: "Adopcja / rodzina zastępcza", praca: "Łączenie z pracą",
  gdzie: "Gdzie złożyć wniosek", zwolnienie: "Ochrona przed zwolnieniem", utrata: "Utrata pracy w ciąży", rehab: "Świadczenie rehabilitacyjne", fallback: "Nierozpoznane pytania",
};
const SCENARIO_LABELS: Record<string, string> = { birth: "Poród", adoption: "Adopcja", foster: "Rodzina zastępcza" };
const TITLE_LABELS: Record<string, string> = { employment: "Umowa o pracę", mandate: "Umowa zlecenia", business: "Działalność", none: "Brak ubezpieczenia" };

/** Ranking jednej serii: poziome paski w jednym odcieniu, wartości jako tekst, tooltip na wierszu. */
function Ranking({ title, data, labels, total }: { title: string; data: Record<string, number>; labels?: Record<string, string>; total: number }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-muted">Brak danych.</p>
      ) : (
        <ul className="space-y-1.5" role="list">
          {rows.map(([k, v]) => {
            const label = labels?.[k] ?? k;
            const share = total ? Math.round((v / total) * 100) : 0;
            return (
              <li key={k} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-1 py-0.5 hover:bg-slate-50" title={`${label}: ${v} (${share}%)`}>
                <span className="truncate text-sm text-ink">{label}</span>
                <span className="text-sm font-semibold tabular-nums text-ink">{v}<span className="ml-1 text-xs font-normal text-muted">{share}%</span></span>
                <span className="col-span-2 h-2 rounded-full bg-slate-100">
                  <span className="block h-2 rounded-full bg-brand transition-all group-hover:bg-brand-dark" style={{ width: `${(v / max) * 100}%` }} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function StatsPanel() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    fetch("/api/stats")
      .then(async (r) => (r.ok ? (setS(await r.json()), setErr("")) : setErr("Sesja urzędnika wygasła – zaloguj się ponownie.")))
      .catch(() => setErr("Błąd połączenia"));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const riskTotal = s ? s.plans : 0;
  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2"><BarChart3 className="text-brand" size={20} /> Anonimowe statystyki</h2>
          <p className="text-sm text-muted">Gdzie rodzice się gubią – tylko liczniki kategorii, bez kwot i danych osobowych.{s && ` Od ${new Date(s.since).toLocaleDateString("pl-PL")}.`}</p>
        </div>
        <button className="btn-ghost !py-1.5 text-sm" onClick={load}><RefreshCw size={15} /> Odśwież</button>
      </div>
      {err && <p className="text-sm text-muted">{err}</p>}
      {s && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Zapisane plany", s.plans], ["Pytania do asystenta", s.questions], ["Wykryte ryzyka", Object.values(s.risks).reduce((a, b) => a + b, 0)], ["Nierozpoznane pytania", s.intents.fallback ?? 0]].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-muted">{l}</p>
                <p className="text-2xl font-bold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Ranking title="O co pytają asystenta" data={s.intents} labels={INTENT_LABELS} total={s.questions} />
            <Ranking title="Najczęstsze ryzyka utraty / obniżenia świadczeń" data={s.risks} total={riskTotal} />
            <Ranking title="Sytuacje" data={s.scenarios} labels={SCENARIO_LABELS} total={s.plans} />
            <Ranking title="Formy zatrudnienia rodziców" data={s.titles} labels={TITLE_LABELS} total={s.plans * 2} />
          </div>
        </>
      )}
    </section>
  );
}

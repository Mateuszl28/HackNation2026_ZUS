"use client";
import { useEffect, useMemo, useState } from "react";
import { calculate, calculatePregnancySickness, compareVariants, deadlines, toICS, pln, diffDays, type CalcInput, type ParentInput, type Period, type InsuranceTitle } from "@zus/engine";
import { DEFAULT_INPUT, useParams, useSession } from "@/lib/session";
import { AlertTriangle, Info, OctagonAlert, FileText, Building2, Landmark, CalendarPlus, Printer, Scale, Trophy } from "lucide-react";

const TITLES: [InsuranceTitle, string][] = [
  ["employment", "Umowa o pracę"],
  ["mandate", "Umowa zlecenia (z dobrowolnym chorobowym)"],
  ["business", "Działalność gospodarcza (dobrowolne chorobowe)"],
  ["none", "Brak ubezpieczenia chorobowego"],
];
const COLORS: Record<string, string> = {
  maternity: "bg-brand",
  maternityFather: "bg-sky-600",
  adoptionMaternity: "bg-brand",
  supplementary: "bg-emerald-400",
  parental: "bg-teal-600",
  paternity: "bg-indigo-500",
  prenatal: "bg-brand",
};

function Num({ label, value, onChange, step = 1, min = 0, max, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input type="number" className="input pr-12" value={Number.isFinite(value) ? value : 0} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        {suffix && <span className="absolute right-3 top-2.5 text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  );
}
function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (b: boolean) => void; hint?: string }) {
  return (
    <label className="flex gap-3 items-start cursor-pointer">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm"><span className="font-medium">{label}</span>{hint && <span className="block text-muted text-xs">{hint}</span>}</span>
    </label>
  );
}

function ParentForm({ who, p, set }: { who: string; p: ParentInput; set: (p: ParentInput) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{who}</h3>
      <label className="block">
        <span className="label">Tytuł ubezpieczenia</span>
        <select className="input" value={p.title} onChange={(e) => set({ ...p, title: e.target.value as InsuranceTitle })}>
          {TITLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      {p.title !== "none" && (
        <>
          <Num label={p.title === "business" ? "Zadeklarowana podstawa składek" : "Średnie wynagrodzenie brutto (12 mies.)"} value={p.monthlyBase} step={100} suffix="zł" onChange={(n) => set({ ...p, monthlyBase: n })} />
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">Ubezpieczony od</span><input type="date" className="input" value={p.insuredSince ?? ""} onChange={(e) => set({ ...p, insuredSince: e.target.value || undefined })} /></label>
            <label className="block"><span className="label">Do (jeśli kończy się)</span><input type="date" className="input" value={p.insuredUntil ?? ""} onChange={(e) => set({ ...p, insuredUntil: e.target.value || undefined })} /></label>
          </div>
          {p.title !== "business" && <Check label="Płatnik zgłasza > 20 ubezpieczonych" hint="Wtedy zasiłek wypłaca pracodawca/zleceniodawca, nie ZUS" checked={!!p.largeEmployer} onChange={(b) => set({ ...p, largeEmployer: b })} />}
          {p.title === "business" && <Num label="Zadłużenie składkowe" value={p.contributionDebt ?? 0} step={10} suffix="zł" onChange={(n) => set({ ...p, contributionDebt: n })} />}
        </>
      )}
    </div>
  );
}

function Timeline({ periods, start }: { periods: Period[]; start: string }) {
  if (!periods.length) return null;
  const min = periods.reduce((m, p) => (p.start < m ? p.start : m), start);
  const max = periods.reduce((m, p) => (p.end > m ? p.end : m), start);
  const span = Math.max(diffDays(min, max) + 1, 1);
  return (
    <div className="space-y-2">
      {(["mother", "father"] as const).map((who) => {
        const ps = periods.filter((p) => p.who === who);
        return (
          <div key={who} className="flex items-center gap-2">
            <span className="w-14 text-xs font-semibold text-muted">{who === "mother" ? "Matka" : "Ojciec"}</span>
            <div className="relative flex-1 h-8 rounded-lg bg-slate-100 overflow-hidden">
              {ps.map((p, i) => (
                <div key={i} title={`${p.label}: ${p.start} – ${p.end}`} className={`absolute top-0 h-full ${COLORS[p.type]} ${p.type === "paternity" ? "opacity-80 h-1/2 top-1/4" : ""} border-r-2 border-white`} style={{ left: `${(diffDays(min, p.start) / span) * 100}%`, width: `${(p.days / span) * 100}%` }} />
              ))}
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-muted pl-16"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

export default function CalculatorPage() {
  const params = useParams();
  const { session, ready, update } = useSession();
  const [input, setInput] = useState<CalcInput>(DEFAULT_INPUT);
  const [tab, setTab] = useState<"mac" | "chor">("mac");
  const [sick, setSick] = useState({ days: 60, startDate: new Date().toISOString().slice(0, 10), used: 0 });

  useEffect(() => {
    if (ready && session.input) setInput({ ...DEFAULT_INPUT, ...session.input, plan: { ...DEFAULT_INPUT.plan, ...session.input.plan } });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<CalcInput>) => setInput((i) => ({ ...i, ...patch }));
  const setPlan = (patch: Partial<CalcInput["plan"]>) => setInput((i) => ({ ...i, plan: { ...i.plan, ...patch } }));
  const result = useMemo(() => calculate(input, params), [input, params]);
  const sickRes = useMemo(() => calculatePregnancySickness({ parent: input.mother, startDate: sick.startDate, days: sick.days, usedDaysThisYear: sick.used }, params), [input.mother, sick, params]);
  const cmp = useMemo(() => compareVariants(input, params), [input, params]);
  const dl = useMemo(() => deadlines(input, result, params), [input, result, params]);
  const bestId = cmp.variants.reduce((a, b) => (b.result.total > a.result.total ? b : a)).id;
  const downloadICS = () => {
    const url = URL.createObjectURL(new Blob([toICS(dl)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "terminy-rodzicielskie.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  const isBirth = input.scenario === "birth";
  const wf = input.plan.workFraction;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div>
          <h1>Zintegrowany kalkulator zasiłków</h1>
          <p className="text-muted">Parametry v{params.version} · zaktualizowano {params.updatedAt}</p>
        </div>
        <div className="flex rounded-xl bg-slate-200 p-1 text-sm">
          <button onClick={() => setTab("mac")} className={`px-3 py-1.5 rounded-lg ${tab === "mac" ? "bg-white shadow font-semibold" : ""}`}>Zasiłek macierzyński</button>
          <button onClick={() => setTab("chor")} className={`px-3 py-1.5 rounded-lg ${tab === "chor" ? "bg-white shadow font-semibold" : ""}`}>Chorobowy w ciąży</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* ---------- FORM ---------- */}
        <div className="space-y-4 print:hidden">
          <section className="card space-y-3">
            <h2>Sytuacja</h2>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
              {([["birth", "Poród"], ["adoption", "Adopcja"], ["foster", "Rodz. zastępcza"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => set({ scenario: v })} className={`rounded-lg py-1.5 ${input.scenario === v ? "bg-white shadow font-semibold text-brand" : ""}`}>{l}</button>
              ))}
            </div>
            <label className="block"><span className="label">{isBirth ? "Data (przewidywanego) porodu" : "Data przyjęcia dziecka"}</span><input type="date" className="input" value={input.eventDate} onChange={(e) => set({ eventDate: e.target.value })} /></label>
            <Num label="Liczba dzieci (przy jednym porodzie / przyjętych)" value={input.children} min={1} max={8} onChange={(n) => set({ children: Math.max(1, Math.round(n)) })} />
            {!isBirth && <Num label="Wiek dziecka" value={input.childAgeYears ?? 0} max={18} suffix="lat" onChange={(n) => set({ childAgeYears: n })} />}
            {input.scenario === "foster" && <Check label="Odroczony obowiązek szkolny" checked={!!input.schoolDeferral} onChange={(b) => set({ schoolDeferral: b })} />}
            {isBirth && (
              <>
                <Check label="Zaświadczenie „Za życiem”" hint="Wydłuża urlop rodzicielski do 65/67 tyg." checked={!!input.zaZyciem} onChange={(b) => set({ zaZyciem: b })} />
                <label className="block">
                  <span className="label">Wcześniak / hospitalizacja noworodka</span>
                  <select className="input" value={input.prematurity} onChange={(e) => set({ prematurity: e.target.value as CalcInput["prematurity"] })}>
                    <option value="none">Nie dotyczy</option>
                    <option value="extreme">Przed 28. tc. lub masa ≤ 1000 g (do {params.supplementary.extremePrematureMaxWeeks} tyg.)</option>
                    <option value="premature">28–36 tc., masa &gt; 1000 g (do {params.supplementary.prematureMaxWeeks} tyg.)</option>
                    <option value="termHospital">Od 37. tc., wymaga hospitalizacji (do {params.supplementary.termHospitalMaxWeeks} tyg.)</option>
                  </select>
                </label>
                {input.prematurity !== "none" && <Num label="Dni pobytu dziecka w szpitalu" value={input.hospitalDays ?? 0} suffix="dni" onChange={(n) => set({ hospitalDays: n })} />}
                <Check label="Urodzenie martwego dziecka" checked={!!input.stillbirth} onChange={(b) => set({ stillbirth: b })} />
              </>
            )}
          </section>

          <section className="card space-y-5">
            <ParentForm who={isBirth ? "Matka" : "Rodzic 1"} p={input.mother} set={(p) => set({ mother: p })} />
            <hr className="border-slate-200" />
            <ParentForm who={isBirth ? "Ojciec" : "Rodzic 2"} p={input.father} set={(p) => set({ father: p })} />
          </section>

          {tab === "mac" && (
            <section className="card space-y-3">
              <h2>Plan urlopów</h2>
              {isBirth && !input.stillbirth && (
                <>
                  <Num label={`Urlop macierzyński przed porodem (max ${params.prenatalMaxWeeks})`} value={input.plan.prenatalWeeks ?? 0} max={params.prenatalMaxWeeks} suffix="tyg." onChange={(n) => setPlan({ prenatalWeeks: Math.min(n, params.prenatalMaxWeeks) })} />
                  <Num label={`Ojciec przejmuje część macierzyńskiego (po ${params.motherObligatoryWeeks} tyg.)`} value={input.plan.fatherTakesMaternityWeeks ?? 0} max={result.limits.maternityWeeks - params.motherObligatoryWeeks} suffix="tyg." onChange={(n) => setPlan({ fatherTakesMaternityWeeks: n })} />
                </>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Num label="Rodzicielski – matka" value={input.plan.motherParentalWeeks ?? 0} max={result.limits.parentalWeeks} suffix="tyg." onChange={(n) => setPlan({ motherParentalWeeks: n })} />
                <Num label="Rodzicielski – ojciec" value={input.plan.fatherParentalWeeks ?? 0} max={result.limits.parentalWeeks} suffix="tyg." onChange={(n) => setPlan({ fatherParentalWeeks: n })} />
              </div>
              <p className="text-xs text-muted">Pula: {result.limits.parentalWeeks} tyg., w tym po {result.limits.nonTransferableWeeks} tyg. nieprzenoszalnych dla każdego rodzica. Do {result.limits.parentalDeadline}.</p>
              {input.scenario !== "foster" && <Check label="Urlop ojcowski (14 dni, 100%)" checked={!!input.plan.paternity} onChange={(b) => setPlan({ paternity: b })} />}
              <Check label="Jeden wniosek – 81,5% za cały okres" hint={`Złożony do ${params.oneApplicationDeadlineDays} dni po porodzie; zamiast 100% + 70%`} checked={!!input.plan.oneApplication} onChange={(b) => setPlan({ oneApplication: b })} />
              <Check label="Łączę urlop rodzicielski z pracą" checked={!!wf} onChange={(b) => setPlan({ workFraction: b ? { who: "mother", fraction: 0.5 } : undefined })} />
              {wf && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="label">Kto</span>
                    <select className="input" value={wf.who} onChange={(e) => setPlan({ workFraction: { ...wf, who: e.target.value as "mother" | "father" } })}>
                      <option value="mother">Matka</option><option value="father">Ojciec</option>
                    </select>
                  </label>
                  <label className="block"><span className="label">Wymiar pracy</span>
                    <select className="input" value={wf.fraction} onChange={(e) => setPlan({ workFraction: { ...wf, fraction: parseFloat(e.target.value) } })}>
                      {[0.125, 0.25, 0.375, 0.5].map((f) => <option key={f} value={f}>{f * 8}/8 etatu</option>)}
                    </select>
                  </label>
                </div>
              )}
            </section>
          )}
          {tab === "chor" && (
            <section className="card space-y-3">
              <h2>Zwolnienie lekarskie w ciąży (kod B)</h2>
              <label className="block"><span className="label">Początek niezdolności</span><input type="date" className="input" value={sick.startDate} onChange={(e) => setSick({ ...sick, startDate: e.target.value })} /></label>
              <Num label="Liczba dni L4" value={sick.days} suffix="dni" onChange={(n) => setSick({ ...sick, days: n })} />
              <Num label="Dni choroby już wykorzystane w tym roku" value={sick.used} suffix="dni" onChange={(n) => setSick({ ...sick, used: n })} />
            </section>
          )}
          <button className="btn-ghost w-full" onClick={() => update({ input })}>Zapisz plan na pulpicie</button>
        </div>

        {/* ---------- RESULTS ---------- */}
        <div className="space-y-4 min-w-0">
          {tab === "chor" ? (
            <section className="card space-y-4">
              <h2>Zasiłek chorobowy w ciąży – matka</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <Stat label="Wynagrodzenie chorobowe (pracodawca)" value={pln(sickRes.employerAmount)} sub={`${sickRes.employerDays} dni`} />
                <Stat label="Zasiłek chorobowy (ZUS/płatnik)" value={pln(sickRes.zusAmount)} sub={`${sickRes.zusDays} dni`} />
                <Stat label="Razem (100% podstawy)" value={pln(sickRes.total)} sub={`podstawa ${pln(sickRes.base)}`} strong />
              </div>
              <Notices list={sickRes.notices} />
              <p className="text-xs text-muted">Okres zasiłkowy: max {params.sicknessPeriodDays} dni. Jeśli niezdolność trwa do porodu – od dnia porodu przysługuje zasiłek macierzyński.</p>
            </section>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-3">
                <Stat label="Matka – łącznie" value={pln(result.mother.total)} sub={result.mother.eligible ? `podstawa ${pln(result.mother.base)}` : "brak prawa"} />
                <Stat label="Ojciec – łącznie" value={pln(result.father.total)} sub={result.father.eligible ? `podstawa ${pln(result.father.base)}` : "brak prawa"} />
                <Stat label="Rodzina – razem" value={pln(result.total)} sub={`${Math.round(result.periods.reduce((s, p) => s + p.days, 0) / 7)} tyg. świadczeń`} strong />
              </div>

              <section className="card space-y-4">
                <h2>Oś czasu</h2>
                <Timeline periods={result.periods} start={input.eventDate} />
                <div className="flex flex-wrap gap-3 text-xs">
                  {Object.entries({ maternity: "Macierzyński", maternityFather: "Macierz. – ojciec", supplementary: "Uzupełniający", parental: "Rodzicielski", paternity: "Ojcowski" }).map(([k, l]) => (
                    <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${COLORS[k]}`} />{l}</span>
                  ))}
                </div>
              </section>

              <section className="card overflow-x-auto">
                <h2 className="mb-3">Okresy i kwoty</h2>
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="text-left text-muted border-b"><tr><th className="py-2">Okres</th><th>Od – do</th><th className="text-right">Tyg.</th><th className="text-right">%</th><th className="text-right">Miesięcznie</th><th className="text-right">Razem</th></tr></thead>
                  <tbody>
                    {result.periods.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100 align-top">
                        <td className="py-2"><span className={`inline-block h-2 w-2 rounded-full mr-2 ${COLORS[p.type]}`} />{p.label}{p.note && <span className="block text-xs text-muted">{p.note}</span>}</td>
                        <td className="whitespace-nowrap">{p.start} – {p.end}</td>
                        <td className="text-right">{p.weeks}</td>
                        <td className="text-right">{Math.round(p.rate * 1000) / 10}</td>
                        <td className="text-right whitespace-nowrap">{pln(p.monthlyAmount)}</td>
                        <td className="text-right whitespace-nowrap font-semibold">{pln(p.total)}</td>
                      </tr>
                    ))}
                    {!result.periods.length && <tr><td colSpan={6} className="py-4 text-center text-muted">Brak okresów, za które przysługuje zasiłek.</td></tr>}
                  </tbody>
                </table>
              </section>

              <Notices list={result.notices} />

              <section className="card">
                <h2 className="mb-3 flex items-center gap-2"><FileText className="text-accent" /> Dokumenty i gdzie je złożyć</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
                  {(["mother", "father"] as const).map((w) => {
                    const r = result[w];
                    if (!r.payer) return null;
                    return (
                      <div key={w} className="rounded-xl bg-slate-50 p-3 flex gap-3">
                        {r.payer === "employer" ? <Building2 className="text-brand shrink-0" /> : <Landmark className="text-accent shrink-0" />}
                        <span><b>{w === "mother" ? "Matka" : "Ojciec"}:</b> zasiłek wypłaca {r.payer === "employer" ? "pracodawca / płatnik składek" : "ZUS"}.</span>
                      </div>
                    );
                  })}
                </div>
                <ul className="divide-y divide-slate-100 text-sm">
                  {result.documents.map((d, i) => (
                    <li key={i} className="py-2 grid sm:grid-cols-[1fr_auto] gap-1">
                      <span><span className="chip bg-slate-100 mr-2">{d.who === "mother" ? "M" : "O"}</span>{d.name}</span>
                      <span className="text-muted text-xs sm:text-right">{d.where} · {d.when}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2 className="mb-1 flex items-center gap-2"><Scale className="text-accent" /> Porównanie wariantów</h2>
                <p className="text-sm text-muted mb-4">Ta sama sytuacja, różne decyzje – zobacz, co się opłaca.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {cmp.variants.map((v) => (
                    <button key={v.id} onClick={() => setInput(v.input)} className={`text-left rounded-xl border p-4 transition hover:border-brand ${v.id === bestId && v.result.total > 0 ? "border-brand bg-brand-light/50" : "border-slate-200"}`}>
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-semibold">{v.name}</p>
                        {v.id === bestId && v.result.total > 0 && <Trophy size={16} className="text-brand shrink-0" />}
                      </div>
                      <p className="text-xs text-muted mt-1">{v.description}</p>
                      <p className="text-xl font-bold mt-2">{pln(v.result.total)}</p>
                      <p className="text-xs text-muted">{v.totalWeeks} tyg. · śr. {pln(v.avgMonthly)}/mies.</p>
                    </button>
                  ))}
                </div>
                <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">{cmp.recommendation}</p>
              </section>

              <section className="card">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <h2 className="flex items-center gap-2"><CalendarPlus className="text-brand" /> Terminy do pilnowania</h2>
                  <div className="flex gap-2 print:hidden">
                    <button className="btn-ghost text-sm !py-1.5" onClick={downloadICS}><CalendarPlus size={16} /> Do kalendarza (.ics)</button>
                    <button className="btn-ghost text-sm !py-1.5" onClick={() => window.print()}><Printer size={16} /> PDF</button>
                  </div>
                </div>
                <ol className="space-y-2">
                  {dl.map((d, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className={`chip h-fit shrink-0 font-mono ${d.critical ? "bg-red-100 text-red-800" : "bg-slate-100"}`}>{d.date}</span>
                      <span><b>{d.title}</b> <span className="text-muted">· {d.who === "both" ? "oboje" : d.who === "mother" ? "matka" : "ojciec"}</span><br /><span className="text-muted">{d.description}</span></span>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`card !p-4 ${strong ? "bg-brand text-white border-brand" : ""}`}>
      <p className={`text-xs ${strong ? "text-white/80" : "text-muted"}`}>{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
      {sub && <p className={`text-xs ${strong ? "text-white/80" : "text-muted"}`}>{sub}</p>}
    </div>
  );
}

function Notices({ list }: { list: { level: string; title: string; text: string }[] }) {
  if (!list.length) return null;
  return (
    <section className="space-y-2">
      {list.map((n, i) => {
        const Icon = n.level === "danger" ? OctagonAlert : n.level === "warning" ? AlertTriangle : Info;
        const cls = n.level === "danger" ? "bg-red-50 border-red-200 text-red-900" : n.level === "warning" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-sky-50 border-sky-200 text-sky-900";
        return (
          <div key={i} className={`rounded-xl border p-3 text-sm flex gap-3 ${cls}`}>
            <Icon size={18} className="shrink-0 mt-0.5" />
            <span><b>{n.title}.</b> {n.text}</span>
          </div>
        );
      })}
    </section>
  );
}

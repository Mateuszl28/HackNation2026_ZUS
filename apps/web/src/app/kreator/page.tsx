"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Briefcase, Building2, CheckCircle2, FileSignature, HeartHandshake, Home, User, Users, XCircle } from "lucide-react";
import { calculate, pln, type CalcInput, type InsuranceTitle } from "@zus/engine";
import { DEFAULT_INPUT, reportPlan, useParams, useSession } from "@/lib/session";

type Answers = {
  scenario: CalcInput["scenario"];
  date: string;
  children: number;
  mTitle: InsuranceTitle;
  mPay: number;
  fTitle: InsuranceTitle;
  fPay: number;
};

const TITLE_OPTS: { v: InsuranceTitle; label: string; icon: typeof Briefcase; hint: string }[] = [
  { v: "employment", label: "Umowa o pracę", icon: Briefcase, hint: "etat, także na część etatu" },
  { v: "mandate", label: "Umowa zlecenia", icon: FileSignature, hint: "z dobrowolnym chorobowym" },
  { v: "business", label: "Własna firma", icon: Building2, hint: "JDG, dobrowolne chorobowe" },
  { v: "none", label: "Nie pracuję / brak chorobowego", icon: Home, hint: "np. umowa o dzieło, bezrobocie" },
];

function Choice({ active, onClick, icon: Icon, label, hint }: { active: boolean; onClick: () => void; icon: typeof Baby; label: string; hint?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${active ? "border-brand bg-brand-light/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}><Icon size={22} /></span>
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export default function Wizard() {
  const params = useParams();
  const { update } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ scenario: "birth", date: DEFAULT_INPUT.eventDate, children: 1, mTitle: "employment", mPay: 7000, fTitle: "employment", fPay: 7000 });
  const set = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));

  const input: CalcInput = useMemo(
    () => ({
      ...DEFAULT_INPUT,
      scenario: a.scenario,
      eventDate: a.date,
      children: a.children,
      childAgeYears: a.scenario === "birth" ? undefined : 2,
      mother: { title: a.mTitle, monthlyBase: a.mTitle === "none" ? 0 : a.mPay },
      father: { title: a.fTitle, monthlyBase: a.fTitle === "none" ? 0 : a.fPay },
      plan: { ...DEFAULT_INPUT.plan, motherParentalWeeks: a.mTitle === "none" ? 0 : a.fTitle === "none" ? 41 : 32, fatherParentalWeeks: a.mTitle === "none" ? 41 : a.fTitle === "none" ? 0 : 9 },
    }),
    [a],
  );
  const r = useMemo(() => calculate(input, params), [input, params]);

  const STEPS = ["Sytuacja", "Termin", "Ty", "Partner/ka", "Wynik"];
  const isBirth = a.scenario === "birth";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-muted">
          {STEPS.map((s, i) => <span key={s} className={i <= step ? "text-brand" : ""}>{s}</span>)}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="card space-y-5 !p-6">
        {step === 0 && (
          <>
            <h1>Jaka jest Twoja sytuacja?</h1>
            <div className="grid gap-3">
              <Choice active={a.scenario === "birth"} onClick={() => set({ scenario: "birth" })} icon={Baby} label="Spodziewamy się dziecka" hint="ciąża lub dziecko już się urodziło" />
              <Choice active={a.scenario === "adoption"} onClick={() => set({ scenario: "adoption" })} icon={HeartHandshake} label="Adoptujemy dziecko" hint="złożony wniosek o przysposobienie" />
              <Choice active={a.scenario === "foster"} onClick={() => set({ scenario: "foster" })} icon={Users} label="Rodzina zastępcza" hint="niezawodowa" />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>{isBirth ? "Kiedy termin porodu?" : "Kiedy przyjmujecie dziecko?"}</h1>
            <input type="date" className="input !py-3 text-lg" value={a.date} onChange={(e) => set({ date: e.target.value })} />
            <div>
              <p className="label">{isBirth ? "Ile dzieci się urodzi?" : "Ile dzieci przyjmujecie?"}</p>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} onClick={() => set({ children: n })} className={`rounded-xl border-2 py-3 text-lg font-bold ${a.children === n ? "border-brand bg-brand-light text-brand" : "border-slate-200"}`}>{n === 4 ? "4+" : n}</button>
                ))}
              </div>
            </div>
          </>
        )}
        {(step === 2 || step === 3) && (() => {
          const me = step === 2;
          const t = me ? a.mTitle : a.fTitle;
          const pay = me ? a.mPay : a.fPay;
          return (
            <>
              <h1>{me ? (isBirth ? "Jak pracujesz? (mama)" : "Jak pracujesz?") : isBirth ? "Jak pracuje tata?" : "Jak pracuje druga osoba?"}</h1>
              <div className="grid gap-3 sm:grid-cols-2">
                {TITLE_OPTS.map((o) => <Choice key={o.v} active={t === o.v} onClick={() => set(me ? { mTitle: o.v } : { fTitle: o.v })} icon={o.icon} label={o.label} hint={o.hint} />)}
              </div>
              {t !== "none" && (
                <label className="block">
                  <span className="label">{t === "business" ? "Zadeklarowana podstawa składek (miesięcznie)" : "Zarobki brutto miesięcznie (średnio z roku)"}</span>
                  <div className="relative">
                    <input type="number" step={100} className="input !py-3 pr-12 text-lg" value={pay} onChange={(e) => set(me ? { mPay: +e.target.value } : { fPay: +e.target.value })} />
                    <span className="absolute right-4 top-3.5 text-muted">zł</span>
                  </div>
                  <input type="range" min={params.minimumWage} max={25000} step={100} value={pay} onChange={(e) => set(me ? { mPay: +e.target.value } : { fPay: +e.target.value })} className="mt-3 w-full accent-[var(--color-brand)]" />
                </label>
              )}
            </>
          );
        })()}
        {step === 4 && (
          <>
            <h1>Twoje uprawnienia</h1>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["mother", "father"] as const).map((w) => {
                const p = r[w];
                return (
                  <div key={w} className={`rounded-2xl border-2 p-4 ${p.eligible ? "border-brand/40 bg-brand-light/40" : "border-red-200 bg-red-50"}`}>
                    <p className="flex items-center gap-2 font-semibold">{p.eligible ? <CheckCircle2 className="text-brand" size={20} /> : <XCircle className="text-red-500" size={20} />} {w === "mother" ? (isBirth ? "Mama" : "Ty") : isBirth ? "Tata" : "Druga osoba"}</p>
                    <p className="mt-2 text-2xl font-bold">{pln(p.total)}</p>
                    <p className="text-sm text-muted">{p.eligible ? `${r.periods.filter((x) => x.who === w).reduce((s, x) => s + x.weeks, 0)} tyg. świadczeń · wypłaca ${p.payer === "employer" ? "pracodawca" : "ZUS"}` : "brak ubezpieczenia chorobowego"}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white">
              <p className="text-white/80">Razem dla rodziny (szacunek)</p>
              <p className="text-4xl font-bold">{pln(r.total)}</p>
              <p className="mt-1 text-sm text-white/80">Macierzyński {r.limits.maternityWeeks} tyg. · rodzicielski {r.limits.parentalWeeks} tyg. · ojcowski 2 tyg.</p>
            </div>
            {r.notices.filter((n) => n.level !== "info").slice(0, 3).map((n, i) => (
              <p key={i} className={`rounded-xl p-3 text-sm ${n.level === "danger" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}><b>{n.title}.</b> {n.text}</p>
            ))}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="btn-primary flex-1" onClick={() => { update({ input }); router.push("/kalkulator"); }}>Dopasuj plan w kalkulatorze <ArrowRight size={18} /></button>
              <button className="btn-ghost flex-1" onClick={() => { update({ input }); router.push("/asystent"); }}>Zapytaj asystenta</button>
            </div>
          </>
        )}

        {step < 4 && (
          <div className="flex justify-between pt-2">
            <button className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ArrowLeft size={18} /> Wstecz</button>
            <button className="btn-primary" onClick={() => { if (step === 3) reportPlan(input, params); setStep((s) => s + 1); }}>{step === 3 ? "Pokaż wynik" : "Dalej"} <ArrowRight size={18} /></button>
          </div>
        )}
        {step === 4 && <button className="text-sm text-muted hover:text-ink" onClick={() => setStep(0)}><User size={14} className="inline" /> Zacznij od nowa</button>}
      </div>
      <p className="mt-4 text-center text-xs text-muted">Szacunek na podstawie podanych danych. Dokładne kwoty po zalogowaniu (dane z ZUS) – <Link href="/logowanie" className="text-accent">zaloguj się</Link>.</p>
    </div>
  );
}

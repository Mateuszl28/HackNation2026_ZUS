"use client";
import { useMemo, useState } from "react";
import { Briefcase, Building2, Landmark, ShieldCheck, Users } from "lucide-react";
import { employerView, pln } from "@zus/engine";
import { DEFAULT_INPUT, useParams } from "@/lib/session";
import Z3Panel from "@/components/Z3Panel";

function Field({ label, value, onChange, suffix, type = "number" }: { label: string; value: string | number; onChange: (v: string) => void; suffix?: string; type?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input type={type} className="input pr-14" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="absolute right-3 top-2.5 text-sm text-muted">{suffix}</span>}
      </div>
    </label>
  );
}

export default function Employer() {
  const params = useParams();
  const [f, setF] = useState({ insuredCount: 12, monthlyGross: 7000, employeeAge: 31, dueDate: DEFAULT_INPUT.eventDate, sickDays: 60, used: 0, parental: 32 });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: k === "dueDate" ? v : Number(v) || 0 }));
  const r = useMemo(
    () => employerView({ insuredCount: f.insuredCount, monthlyGross: f.monthlyGross, employeeAge: f.employeeAge, dueDate: f.dueDate, sickDays: f.sickDays, usedSickDaysThisYear: f.used, leave: { motherParentalWeeks: f.parental } }, params),
    [f, params],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="chip mb-2 bg-accent/10 text-accent"><Briefcase size={14} className="mr-1" /> Dla płatników składek</p>
        <h1>Pracownica w ciąży – co musi zrobić pracodawca?</h1>
        <p className="text-muted">Kto wypłaca zasiłki, ile kosztuje Cię wynagrodzenie chorobowe, jakie masz obowiązki i terminy.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="card h-fit space-y-3">
          <h2>Dane</h2>
          <Field label="Liczba ubezpieczonych w chorobowym (stan na 30.11 ub. r.)" value={f.insuredCount} onChange={(v) => set("insuredCount", v)} suffix="os." />
          <Field label="Wynagrodzenie brutto pracownicy" value={f.monthlyGross} onChange={(v) => set("monthlyGross", v)} suffix="zł" />
          <Field label="Wiek pracownicy" value={f.employeeAge} onChange={(v) => set("employeeAge", v)} suffix="lat" />
          <Field label="Przewidywana data porodu" type="date" value={f.dueDate} onChange={(v) => set("dueDate", v)} />
          <Field label="Przewidywane L4 w ciąży" value={f.sickDays} onChange={(v) => set("sickDays", v)} suffix="dni" />
          <Field label="Dni choroby już w tym roku" value={f.used} onChange={(v) => set("used", v)} suffix="dni" />
          <Field label="Urlop rodzicielski pracownicy" value={f.parental} onChange={(v) => set("parental", v)} suffix="tyg." />
        </section>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`card !p-4 border-l-4 ${r.paysBenefits ? "border-l-accent" : "border-l-brand"}`}>
              <p className="flex items-center gap-1.5 text-xs text-muted">{r.paysBenefits ? <Building2 size={14} /> : <Landmark size={14} />} Zasiłki wypłaca</p>
              <p className="mt-1 text-lg font-bold">{r.paysBenefits ? "Pracodawca" : "ZUS"}</p>
              <p className="text-xs text-muted"><Users size={12} className="inline" /> {f.insuredCount} {f.insuredCount > 20 ? "> 20" : "≤ 20"} ubezpieczonych</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-muted">Koszt pracodawcy: wynagrodzenie chorobowe</p>
              <p className="mt-1 text-lg font-bold">{pln(r.employerSickCost)}</p>
              <p className="text-xs text-muted">{r.employerSickDays} dni · ze środków pracodawcy</p>
            </div>
            <div className="card !p-4">
              <p className="text-xs text-muted">Zasiłki (chorobowy + macierzyński) – z FUS</p>
              <p className="mt-1 text-lg font-bold">{pln(r.benefitsTotal)}</p>
              <p className="text-xs text-muted">{r.paysBenefits ? "wypłacasz i rozliczasz w ZUS DRA" : "wypłaca ZUS"}</p>
            </div>
          </div>

          <section className="card">
            <h2 className="mb-1">Obowiązki i terminy</h2>
            <p className="mb-4 text-sm text-muted">Podstawa wymiaru zasiłku pracownicy: <b>{pln(r.base)}</b> (wynagrodzenie po odliczeniu 13,71% składek).</p>
            <ol className="relative ml-3 space-y-5 border-l-2 border-slate-200">
              {r.tasks.map((t, i) => (
                <li key={i} className="relative pl-6">
                  <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white bg-brand" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.when}</p>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-muted">{t.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="card">
            <h2 className="mb-3">Okresy urlopu pracownicy</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {r.periods.map((p, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{p.label}</span>
                  <span className="text-muted">{p.start} – {p.end} · {p.weeks} tyg. · {Math.round(p.rate * 100)}% · <b className="text-ink">{pln(p.total)}</b></span>
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-900"><ShieldCheck size={18} className="shrink-0" /> Liczbę ubezpieczonych ustala się według stanu na 30 listopada poprzedniego roku (nowi płatnicy – według pierwszego miesiąca zgłoszeń). Zasiłki są finansowane z Funduszu Ubezpieczeń Społecznych – koszt pracodawcy to wyłącznie wynagrodzenie chorobowe.</p>
        </div>
      </div>
      <Z3Panel />
    </div>
  );
}

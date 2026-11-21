"use client";
import { DEFAULTS, useAdmin } from "@/components/admin/AdminContext";

type Field = [path: string, label: string, opts?: { step?: number; unit?: string; pct?: boolean }];
const GROUPS: { title: string; desc: string; fields: Field[] }[] = [
  {
    title: "Wysokość świadczeń",
    desc: "Art. 31 ustawy zasiłkowej. Stopy jako ułamek (1 = 100%).",
    fields: [
      ["rates.maternity", "Macierzyński / na warunkach / uzupełniający / ojcowski", { step: 0.001, pct: true }],
      ["rates.parental", "Rodzicielski", { step: 0.001, pct: true }],
      ["rates.oneApplication", "Jeden wniosek do 21 dni po porodzie", { step: 0.001, pct: true }],
      ["rates.sicknessPregnancy", "Zasiłek chorobowy w ciąży (kod B)", { step: 0.001, pct: true }],
      ["rates.rehabPregnancy", "Świadczenie rehabilitacyjne w ciąży", { step: 0.001, pct: true }],
      ["oneApplicationDeadlineDays", "Termin wniosku o 81,5%", { unit: "dni" }],
      ["minBenefitMonthly", "Minimalny zasiłek (świadczenie rodzicielskie)", { unit: "zł" }],
      ["funeralGrant", "Zasiłek pogrzebowy", { unit: "zł" }],
    ],
  },
  {
    title: "Wymiar urlopów",
    desc: "Kodeks pracy, art. 180–183.",
    fields: [
      ["parentalWeeks.single", "Rodzicielski – 1 dziecko", { unit: "tyg." }],
      ["parentalWeeks.multiple", "Rodzicielski – więcej dzieci", { unit: "tyg." }],
      ["parentalWeeks.zaZyciemSingle", "Rodzicielski „Za życiem” – 1 dziecko", { unit: "tyg." }],
      ["parentalWeeks.zaZyciemMultiple", "Rodzicielski „Za życiem” – więcej dzieci", { unit: "tyg." }],
      ["parentalNonTransferableWeeks", "Część nieprzenoszalna na rodzica", { unit: "tyg." }],
      ["parentalMaxParts", "Maks. liczba części rodzicielskiego", { unit: "części" }],
      ["motherObligatoryWeeks", "Macierzyński wykorzystywany obowiązkowo przez matkę", { unit: "tyg." }],
      ["prenatalMaxWeeks", "Maks. macierzyński przed porodem", { unit: "tyg." }],
      ["paternityDays", "Urlop ojcowski", { unit: "dni" }],
      ["stillbirthWeeks", "Martwe urodzenie / zgon dziecka", { unit: "tyg." }],
      ["adoptionMinWeeks", "Urlop na warunkach macierzyńskiego – minimum", { unit: "tyg." }],
    ],
  },
  {
    title: "Uzupełniający urlop macierzyński",
    desc: "KP art. 180² – 1 tydzień za każdy tydzień pobytu dziecka w szpitalu.",
    fields: [
      ["supplementary.extremePrematureMaxWeeks", "Poród < 28. tc. lub masa ≤ 1000 g – maks.", { unit: "tyg." }],
      ["supplementary.prematureMaxWeeks", "Poród 28–36 tc. i masa > 1000 g – maks.", { unit: "tyg." }],
      ["supplementary.termHospitalMaxWeeks", "Poród ≥ 37 tc. – maks.", { unit: "tyg." }],
      ["supplementary.termMinHospitalDays", "Poród ≥ 37 tc. – min. kolejnych dni w szpitalu", { unit: "dni" }],
    ],
  },
  {
    title: "Zasiłek chorobowy i podstawa wymiaru",
    desc: "Ustawa zasiłkowa, art. 4, 8, 18, 36–38.",
    fields: [
      ["waitingPeriodDays.mandatory", "Okres wyczekiwania – ubezpieczenie obowiązkowe", { unit: "dni" }],
      ["waitingPeriodDays.voluntary", "Okres wyczekiwania – ubezpieczenie dobrowolne", { unit: "dni" }],
      ["sicknessPeriodDays", "Okres zasiłkowy", { unit: "dni" }],
      ["rehabMaxDays", "Świadczenie rehabilitacyjne – maks.", { unit: "dni" }],
      ["employerPaidDays.under50", "Wynagrodzenie chorobowe – pracownik < 50 lat", { unit: "dni" }],
      ["employerPaidDays.over50", "Wynagrodzenie chorobowe – pracownik ≥ 50 lat", { unit: "dni" }],
      ["socialContributionEmployeeRate", "Składki ubezpieczonego odliczane od podstawy", { step: 0.0001, pct: true }],
      ["voluntaryBaseCapMonthly", "Limit podstawy dobrowolnego chorobowego (przed odliczeniem)", { unit: "zł" }],
      ["minimumWage", "Minimalne wynagrodzenie", { unit: "zł" }],
    ],
  },
];

const get = (o: unknown, p: string) => p.split(".").reduce<any>((a, k) => a?.[k], o); // eslint-disable-line @typescript-eslint/no-explicit-any
const setIn = (o: any, p: string, v: unknown) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ks = p.split(".");
  const c = structuredClone(o);
  ks.slice(0, -1).reduce((a, k) => (a[k] ??= {}), c)[ks.at(-1)!] = v;
  return c;
};
const fmt = (v: unknown, pct?: boolean) => (typeof v === "number" ? (pct ? `${(v * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%` : v.toLocaleString("pl-PL")) : String(v ?? "–"));

export default function ParamsPage() {
  const { draft, setDraft, saved } = useAdmin();
  if (!draft || !saved) return <div className="card h-40 animate-pulse" />;
  const p = draft.params;
  const changedCount = GROUPS.flatMap((g) => g.fields).filter(([path]) => get(p, path) !== get(saved.params, path)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Parametry prawne</h1>
          <p className="text-muted">Zmiana po zapisaniu obowiązuje od razu w kalkulatorach, API i aplikacji mobilnej. Każdy zapis trafia do historii zmian.</p>
        </div>
        {changedCount > 0 && <span className="chip bg-amber-100 !py-1.5 text-amber-800">Zmienione pola: {changedCount}</span>}
      </div>

      <section className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Wersja zestawu parametrów</span><input className="input" value={p.version} onChange={(e) => setDraft({ ...draft, params: { ...p, version: e.target.value } })} /></label>
          <label className="block"><span className="label">Urlop macierzyński wg liczby dzieci (1, 2, 3, 4, 5+) – tygodnie</span><input className="input" value={p.maternityWeeksByChildren.join(", ")} onChange={(e) => setDraft({ ...draft, params: { ...p, maternityWeeksByChildren: e.target.value.split(",").map((x) => parseInt(x) || 0) } })} /></label>
        </div>
      </section>

      {GROUPS.map((g) => (
        <section key={g.title} className="card">
          <h2>{g.title}</h2>
          <p className="mb-4 text-sm text-muted">{g.desc}</p>
          <div className="divide-y divide-slate-100">
            {g.fields.map(([path, label, o]) => {
              const v = get(p, path);
              const def = get(DEFAULTS, path);
              const changed = v !== get(saved.params, path);
              const nonDefault = v !== def;
              return (
                <div key={path} className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_180px_150px]">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="font-mono text-[11px] text-muted">{path}</p>
                  </div>
                  <div className="relative">
                    <input type="number" step={o?.step ?? 1} className={`input pr-12 ${changed ? "!border-amber-400 !bg-amber-50" : ""}`} value={v ?? ""} onChange={(e) => setDraft({ ...draft, params: setIn(p, path, e.target.value === "" ? undefined : parseFloat(e.target.value)) })} />
                    <span className="absolute right-3 top-2.5 text-xs text-muted">{o?.pct ? fmt(v, true) : o?.unit}</span>
                  </div>
                  <p className="text-xs text-muted sm:text-right">
                    domyślnie: {fmt(def, o?.pct)}
                    {nonDefault && <button className="ml-2 font-semibold text-accent" onClick={() => setDraft({ ...draft, params: setIn(p, path, def) })}>przywróć</button>}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

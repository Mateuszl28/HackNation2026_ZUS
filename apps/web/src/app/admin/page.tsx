"use client";
import { useEffect, useState } from "react";
import { Lock, RotateCcw, Save } from "lucide-react";
import type { Params, SupportOrg } from "@zus/engine";

interface Config { params: Params; support: SupportOrg[]; history?: { at: string; version: string; note?: string; changes: { path: string; from: unknown; to: unknown }[] }[] }

// Edytowalne pola liczbowe – ścieżka w obiekcie Params
const FIELDS: [string, string, number?][] = [
  ["rates.maternity", "Stopa: macierzyński / ojcowski / uzupełniający", 0.001],
  ["rates.parental", "Stopa: rodzicielski", 0.001],
  ["rates.oneApplication", "Stopa: jeden wniosek (81,5%)", 0.001],
  ["rates.sicknessPregnancy", "Stopa: chorobowy w ciąży", 0.001],
  ["oneApplicationDeadlineDays", "Termin wniosku 81,5% (dni po porodzie)"],
  ["socialContributionEmployeeRate", "Potrącenie składek z podstawy", 0.0001],
  ["parentalWeeks.single", "Rodzicielski – 1 dziecko (tyg.)"],
  ["parentalWeeks.multiple", "Rodzicielski – więcej dzieci (tyg.)"],
  ["parentalWeeks.zaZyciemSingle", "Rodzicielski „Za życiem” – 1 dziecko"],
  ["parentalWeeks.zaZyciemMultiple", "Rodzicielski „Za życiem” – więcej dzieci"],
  ["parentalNonTransferableWeeks", "Nieprzenoszalne tygodnie na rodzica"],
  ["parentalMaxParts", "Maks. liczba części rodzicielskiego"],
  ["motherObligatoryWeeks", "Obowiązkowe tygodnie matki"],
  ["prenatalMaxWeeks", "Maks. tygodnie przed porodem"],
  ["paternityDays", "Urlop ojcowski (dni)"],
  ["stillbirthWeeks", "Martwe urodzenie (tyg.)"],
  ["supplementary.extremePrematureMaxWeeks", "Uzupełniający: < 28 tc. (tyg.)"],
  ["supplementary.prematureMaxWeeks", "Uzupełniający: 28–36 tc. (tyg.)"],
  ["supplementary.termHospitalMaxWeeks", "Uzupełniający: ≥ 37 tc. (tyg.)"],
  ["waitingPeriodDays.mandatory", "Okres wyczekiwania – obowiązkowe (dni)"],
  ["waitingPeriodDays.voluntary", "Okres wyczekiwania – dobrowolne (dni)"],
  ["sicknessPeriodDays", "Okres zasiłkowy (dni)"],
  ["minBenefitMonthly", "Minimalny zasiłek macierzyński (zł/mies.)"],
  ["voluntaryBaseCapMonthly", "Limit podstawy – dobrowolne (zł)"],
];

const get = (o: unknown, p: string) => p.split(".").reduce<any>((a, k) => a?.[k], o); // eslint-disable-line @typescript-eslint/no-explicit-any
const setIn = (o: any, p: string, v: unknown) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ks = p.split(".");
  const c = structuredClone(o);
  ks.slice(0, -1).reduce((a, k) => a[k], c)[ks.at(-1)!] = v;
  return c;
};

export default function Admin() {
  const [token, setToken] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { fetch("/api/params").then((r) => r.json()).then(setCfg); }, []);

  const save = async (body: unknown) => {
    const r = await fetch("/api/params", { method: "PUT", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setMsg("❌ " + j.error);
    setCfg(j);
    setMsg("✓ Zapisano – kalkulatory używają nowych parametrów.");
  };

  if (!cfg) return <div className="card animate-pulse h-40" />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3 items-end">
        <div>
          <h1>Panel administracyjny</h1>
          <p className="text-muted">Parametry prawne v{cfg.params.version} · ostatnia zmiana {cfg.params.updatedAt}. Zmiana działa natychmiast w webie, API i aplikacji mobilnej.</p>
        </div>
        <label className="flex items-center gap-2"><Lock size={16} /><input className="input !w-40" type="password" placeholder="Token (demo: admin)" value={token} onChange={(e) => setToken(e.target.value)} /></label>
      </div>
      <section className="card">
        <h2 className="mb-4">Parametry</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block"><span className="label">Wersja parametrów</span><input className="input" value={cfg.params.version} onChange={(e) => setCfg({ ...cfg, params: { ...cfg.params, version: e.target.value } })} /></label>
          <label className="block"><span className="label">Urlop macierzyński wg liczby dzieci (tyg., po przecinku)</span><input className="input" value={cfg.params.maternityWeeksByChildren.join(", ")} onChange={(e) => setCfg({ ...cfg, params: { ...cfg.params, maternityWeeksByChildren: e.target.value.split(",").map((x) => parseInt(x) || 0) } })} /></label>
          {FIELDS.map(([path, label, step]) => (
            <label key={path} className="block"><span className="label">{label}</span>
              <input type="number" step={step ?? 1} className="input" value={get(cfg.params, path)} onChange={(e) => setCfg({ ...cfg, params: setIn(cfg.params, path, parseFloat(e.target.value)) })} />
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <h2 className="mb-2">Organizacje wsparcia (JSON)</h2>
        <textarea className="input font-mono text-xs h-56" defaultValue={JSON.stringify(cfg.support, null, 2)} onBlur={(e) => { try { setCfg({ ...cfg, support: JSON.parse(e.target.value) }); setMsg(""); } catch { setMsg("❌ Niepoprawny JSON"); } }} />
      </section>
      <section className="card">
        <h2 className="mb-3">Historia zmian (audyt)</h2>
        {!cfg.history?.length ? <p className="text-sm text-muted">Brak zmian – obowiązują parametry domyślne.</p> : (
          <ol className="space-y-3">
            {cfg.history.map((h, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold">{new Date(h.at).toLocaleString("pl-PL")} · v{h.version}{h.note && <span className="font-normal text-muted"> – {h.note}</span>}</p>
                <ul className="mt-1 font-mono text-xs text-muted">
                  {h.changes.slice(0, 8).map((c) => <li key={c.path}>{c.path}: <span className="text-red-700 line-through">{JSON.stringify(c.from)}</span> → <span className="text-brand">{JSON.stringify(c.to)}</span></li>)}
                  {h.changes.length > 8 && <li>… i {h.changes.length - 8} więcej</li>}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="flex flex-wrap gap-2 items-center sticky bottom-4">
        <input className="input !w-72" placeholder="Podstawa zmiany, np. nowelizacja Dz.U. …" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-primary" onClick={() => { save({ ...cfg, note }); setNote(""); }}><Save size={16} /> Zapisz</button>
        <button className="btn-ghost" onClick={() => save({ reset: true })}><RotateCcw size={16} /> Przywróć domyślne</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}

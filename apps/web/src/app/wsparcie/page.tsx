"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Phone } from "lucide-react";
import { OFFICIAL_LINKS, SUPPORT_ORGS, type SupportOrg } from "@zus/engine";

const TOPICS = { all: "Wszystkie", strata: "Strata dziecka / poronienie", wczesniak: "Wcześniak", choroba: "Ciężka choroba dziecka", porod: "Poród", kryzys: "Kryzys emocjonalny" } as const;

export default function Support() {
  const [orgs, setOrgs] = useState<SupportOrg[]>(SUPPORT_ORGS);
  const [topic, setTopic] = useState<keyof typeof TOPICS>("all");
  useEffect(() => {
    fetch("/api/params").then((r) => r.json()).then((c) => c?.support && setOrgs(c.support)).catch(() => {});
  }, []);
  const list = orgs.filter((o) => topic === "all" || o.topics.includes(topic));
  return (
    <div className="space-y-6">
      <div>
        <h1>Wsparcie w trudnych sytuacjach</h1>
        <p className="text-muted">Organizacje o charakterze wyłącznie charytatywnym oraz oficjalne źródła informacji.</p>
      </div>
      <div className="card bg-sky-50 border-sky-200 text-sm text-sky-900">
        <b>Po stracie dziecka</b> przysługuje zasiłek macierzyński za co najmniej 8 tygodni po porodzie (a przy zgonie po 8. tygodniu życia – 7 dni od zgonu). Nie musisz niczego załatwiać od razu – kalkulator pokaże uprawnienia, gdy będziesz gotowa/gotowy.
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TOPICS) as (keyof typeof TOPICS)[]).map((t) => (
          <button key={t} onClick={() => setTopic(t)} className={`chip !py-1.5 !px-3 ${topic === t ? "bg-brand text-white" : "bg-white border border-slate-300"}`}>{TOPICS[t]}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((o) => (
          <div key={o.name} className="card space-y-2">
            <h2>{o.name}</h2>
            <p className="text-sm text-muted">{o.description}</p>
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              {o.url && <a href={o.url} target="_blank" rel="noreferrer" className="text-accent flex items-center gap-1">Strona <ExternalLink size={14} /></a>}
              {o.phone && <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="text-brand flex items-center gap-1"><Phone size={14} /> {o.phone}</a>}
            </div>
          </div>
        ))}
      </div>
      <section className="card">
        <h2 className="mb-2">Oficjalne źródła</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {OFFICIAL_LINKS.map((l) => <li key={l.url}><a className="text-accent hover:underline flex items-center gap-1" href={l.url} target="_blank" rel="noreferrer">{l.name} <ExternalLink size={12} /></a></li>)}
        </ul>
      </section>
    </div>
  );
}

"use client";
import { Plus, Trash2 } from "lucide-react";
import type { SupportOrg } from "@zus/engine";
import { useAdmin } from "@/components/admin/AdminContext";

const TOPICS: { v: SupportOrg["topics"][number]; label: string }[] = [
  { v: "strata", label: "Strata dziecka" },
  { v: "wczesniak", label: "Wcześniak" },
  { v: "choroba", label: "Ciężka choroba" },
  { v: "porod", label: "Poród" },
  { v: "kryzys", label: "Kryzys" },
];

export default function OrgsPage() {
  const { draft, setDraft } = useAdmin();
  if (!draft) return <div className="card h-40 animate-pulse" />;
  const orgs = draft.support;
  const update = (i: number, patch: Partial<SupportOrg>) => setDraft({ ...draft, support: orgs.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  const remove = (i: number) => setDraft({ ...draft, support: orgs.filter((_, k) => k !== i) });
  const add = () => setDraft({ ...draft, support: [...orgs, { name: "", description: "", topics: [], url: "" }] });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Organizacje wsparcia</h1>
          <p className="text-muted">Lista wyświetlana rodzicom w sekcji „Wsparcie” (tylko podmioty o charakterze wyłącznie charytatywnym i instytucje publiczne).</p>
        </div>
        <button className="btn-primary" onClick={add}><Plus size={16} /> Dodaj organizację</button>
      </div>

      {orgs.map((o, i) => (
        <section key={i} className="card space-y-3">
          <div className="flex items-start gap-3">
            <label className="block flex-1"><span className="label">Nazwa</span><input className="input font-semibold" value={o.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="np. Fundacja …" /></label>
            <button className="mt-6 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-red-600 hover:bg-red-50" onClick={() => remove(i)} aria-label={`Usuń ${o.name}`} title="Usuń"><Trash2 size={18} /></button>
          </div>
          <label className="block"><span className="label">Opis</span><textarea className="input min-h-16" value={o.description} onChange={(e) => update(i, { description: e.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label">Strona www</span><input className="input" value={o.url ?? ""} onChange={(e) => update(i, { url: e.target.value || undefined })} placeholder="https://…" /></label>
            <label className="block"><span className="label">Telefon</span><input className="input" value={o.phone ?? ""} onChange={(e) => update(i, { phone: e.target.value || undefined })} /></label>
          </div>
          <div>
            <span className="label">Kategorie</span>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => {
                const on = o.topics.includes(t.v);
                return (
                  <button key={t.v} onClick={() => update(i, { topics: on ? o.topics.filter((x) => x !== t.v) : [...o.topics, t.v] })} className={`chip !px-3 !py-1.5 ${on ? "bg-[#123a5c] text-white" : "border border-slate-300 bg-white"}`} aria-pressed={on}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}
      {!orgs.length && <p className="card text-sm text-muted">Brak organizacji – dodaj pierwszą.</p>}
    </div>
  );
}

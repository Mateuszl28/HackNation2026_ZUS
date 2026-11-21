"use client";
import { useState } from "react";
import { CheckCircle2, Printer, Send } from "lucide-react";
import { useSession } from "@/lib/session";

const FORMS = {
  urlop: { title: "Wniosek o urlop związany z rodzicielstwem", to: "Pracodawca", desc: "Macierzyński, rodzicielski, ojcowski, uzupełniający – składany min. 21 dni przed rozpoczęciem (rodzicielski/ojcowski)." },
  zam: { title: "ZAM – wniosek o zasiłek macierzyński", to: "ZUS (eZUS)", desc: "Dla zleceniobiorców i przedsiębiorców. Od 24.10.2026 zastępuje także ZUR i ZAO." },
  odpis: { title: "Wniosek o odpis aktu urodzenia", to: "Urząd Stanu Cywilnego (gov.pl)", desc: "Skrócony lub zupełny odpis aktu urodzenia dziecka." },
} as const;
type FormKey = keyof typeof FORMS;

export default function Applications() {
  const { session } = useSession();
  const [form, setForm] = useState<FormKey>("urlop");
  const [sent, setSent] = useState<string | null>(null);
  const [v, setV] = useState<Record<string, string>>({ type: "macierzyński", from: session.input?.eventDate ?? "", weeks: "20", copyType: "skrócony" });
  const f = FORMS[form];
  const field = (k: string, label: string, type = "text") => (
    <label className="block"><span className="label">{label}</span><input type={type} className="input" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );

  return (
    <div className="space-y-6">
      <h1>Wnioski</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(FORMS) as FormKey[]).map((k) => (
          <button key={k} onClick={() => { setForm(k); setSent(null); }} className={`card text-left !p-4 ${form === k ? "!border-brand ring-2 ring-brand/20" : ""}`}>
            <p className="font-semibold">{FORMS[k].title}</p>
            <p className="text-xs text-muted mt-1">→ {FORMS[k].to}</p>
          </button>
        ))}
      </div>

      <section className="card space-y-4 max-w-2xl">
        <h2>{f.title}</h2>
        <p className="text-sm text-muted">{f.desc}</p>
        {sent ? (
          <div className="rounded-xl bg-brand-light p-4 text-brand flex gap-3"><CheckCircle2 /> <span>Wniosek wysłany (symulacja) do: <b>{f.to}</b>. Numer: <b>{sent}</b>. Potwierdzenie (UPO) zapisano na koncie.</span></div>
        ) : (
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); setSent(`${form.toUpperCase()}-${Date.now().toString().slice(-8)}`); }}>
            {field("name", "Imię i nazwisko")}
            {field("pesel", "PESEL")}
            {form === "urlop" && (
              <>
                <label className="block"><span className="label">Rodzaj urlopu</span>
                  <select className="input" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
                    {["macierzyński", "rodzicielski", "ojcowski", "uzupełniający macierzyński", "na warunkach urlopu macierzyńskiego"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                {field("from", "Od dnia", "date")}
                {field("weeks", "Wymiar (tygodnie)", "number")}
                {field("child", "Imię i data urodzenia dziecka")}
                <label className="sm:col-span-2 flex gap-2 text-sm"><input type="checkbox" onChange={(e) => setV({ ...v, work: e.target.checked ? "1" : "" })} /> Łączę urlop rodzicielski z pracą u pracodawcy (wymiar ≤ 1/2 etatu)</label>
                <label className="sm:col-span-2 flex gap-2 text-sm"><input type="checkbox" onChange={(e) => setV({ ...v, one: e.target.checked ? "1" : "" })} /> Wnoszę o zasiłek 81,5% za cały okres (do 21 dni po porodzie)</label>
              </>
            )}
            {form === "zam" && (
              <>
                {field("from", "Okres zasiłku od", "date")}
                {field("to", "do", "date")}
                {field("account", "Numer rachunku bankowego")}
                <label className="block"><span className="label">Tytuł</span><select className="input"><option>urlop macierzyński</option><option>urlop rodzicielski</option><option>urlop ojcowski</option></select></label>
              </>
            )}
            {form === "odpis" && (
              <>
                <label className="block"><span className="label">Rodzaj odpisu</span><select className="input" value={v.copyType} onChange={(e) => setV({ ...v, copyType: e.target.value })}><option>skrócony</option><option>zupełny</option><option>wielojęzyczny</option></select></label>
                {field("child", "Imię i nazwisko dziecka")}
                {field("birth", "Data urodzenia", "date")}
                {field("place", "Miejsce urodzenia")}
              </>
            )}
            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
              <button className="btn-primary"><Send size={16} /> Wyślij do: {f.to}</button>
              <button type="button" className="btn-ghost" onClick={() => window.print()}><Printer size={16} /> Drukuj</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

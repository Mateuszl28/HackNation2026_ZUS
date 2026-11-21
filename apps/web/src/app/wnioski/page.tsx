"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Printer, Send, Sparkles, X } from "lucide-react";
import { addDays, calculate, type Period } from "@zus/engine";
import { useParams, useSession } from "@/lib/session";

const FORMS = {
  zam: { title: "ZAM – wniosek o zasiłek macierzyński", to: "ZUS (eZUS)", desc: "Dla zleceniobiorców i przedsiębiorców. Od 24.10.2026 zastępuje także ZUR i ZAO." },
  odpis: { title: "Wniosek o odpis aktu urodzenia", to: "Urząd Stanu Cywilnego (gov.pl)", desc: "Skrócony lub zupełny odpis aktu urodzenia dziecka." },
} as const;
type FormKey = keyof typeof FORMS;

const LEAVE_NAME: Record<string, string> = {
  maternity: "urlopu macierzyńskiego",
  maternityFather: "części urlopu macierzyńskiego (przejęcie przez ojca)",
  adoptionMaternity: "urlopu na warunkach urlopu macierzyńskiego",
  supplementary: "uzupełniającego urlopu macierzyńskiego",
  parental: "urlopu rodzicielskiego",
  paternity: "urlopu ojcowskiego",
};
const ART: Record<string, string> = {
  maternity: "art. 180 § 1",
  maternityFather: "art. 180 § 5",
  adoptionMaternity: "art. 183 § 1",
  supplementary: "art. 180¹",
  parental: "art. 182¹a § 1",
  paternity: "art. 182³ § 1",
};
const fmtPL = (iso: string) => iso.split("-").reverse().join(".");

function LeaveDocument({ p, name, oneApp, onClose }: { p: Period; name: string; oneApp: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const work = p.label.includes("praca");
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-2xl print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b p-3 print:hidden">
          <span className="text-sm font-semibold">Podgląd wniosku</span>
          <div className="flex gap-2">
            <button className="btn-primary !py-1.5 text-sm" onClick={() => window.print()}><Printer size={16} /> Drukuj / PDF</button>
            <button className="btn-ghost !py-1.5" onClick={onClose} aria-label="Zamknij"><X size={16} /></button>
          </div>
        </div>
        <article className="space-y-6 p-8 font-serif text-[15px] leading-relaxed sm:p-12">
          <div className="flex justify-between text-sm">
            <div>
              <p className="border-b border-dotted border-slate-400 min-w-48">{name || " "}</p>
              <p className="text-xs text-slate-500">(imię i nazwisko pracownika)</p>
              <p className="mt-3 border-b border-dotted border-slate-400 min-w-48">&nbsp;</p>
              <p className="text-xs text-slate-500">(stanowisko / komórka organizacyjna)</p>
            </div>
            <p>…………………, dnia {fmtPL(today)} r.</p>
          </div>
          <div className="ml-auto w-fit text-right">
            <p className="font-bold">Pracodawca</p>
            <p className="border-b border-dotted border-slate-400 min-w-56">&nbsp;</p>
          </div>
          <h2 className="text-center !text-lg font-bold uppercase tracking-wide">Wniosek o udzielenie {LEAVE_NAME[p.type]}</h2>
          <p>
            Na podstawie {ART[p.type]} ustawy z dnia 26 czerwca 1974 r. – Kodeks pracy wnoszę o udzielenie mi {LEAVE_NAME[p.type]} w wymiarze <b>{p.weeks} {p.type === "paternity" ? `tygodni (${p.days} dni)` : "tygodni"}</b>, w okresie <b>od {fmtPL(p.start)} r. do {fmtPL(p.end)} r.</b>
          </p>
          {p.type === "parental" && <p>Oświadczam, że jest to część urlopu rodzicielskiego wykorzystywana {work ? "w połączeniu z wykonywaniem pracy" : "w pełnym wymiarze"}.{work && " Wnoszę o umożliwienie łączenia urlopu z wykonywaniem pracy w wymiarze nieprzekraczającym połowy pełnego wymiaru czasu pracy."}</p>}
          {oneApp && (p.type === "maternity" || p.type === "parental") && <p>Jednocześnie wnoszę o udzielenie bezpośrednio po urlopie macierzyńskim urlopu rodzicielskiego w pełnym wymiarze oraz o wypłatę zasiłku macierzyńskiego w wysokości 81,5% podstawy wymiaru za cały ten okres.</p>}
          <p>Dane dziecka: ………………………………………………, data urodzenia / przyjęcia: ………………………</p>
          <div>
            <p className="font-bold">Załączniki:</p>
            <ol className="list-decimal pl-6 text-sm">
              <li>Skrócony odpis aktu urodzenia dziecka (lub inny dokument potwierdzający).</li>
              {p.type === "maternityFather" && <li>Oświadczenie matki o rezygnacji z części urlopu macierzyńskiego.</li>}
              {p.type === "parental" && <li>Oświadczenie drugiego z rodziców o wykorzystanym urlopie rodzicielskim lub o niekorzystaniu z niego.</li>}
              {p.type === "supplementary" && <li>Zaświadczenie ze szpitala o okresie pobytu dziecka w szpitalu.</li>}
            </ol>
          </div>
          <div className="flex justify-end pt-10">
            <div className="text-center">
              <p className="border-b border-dotted border-slate-400 min-w-56">&nbsp;</p>
              <p className="text-xs text-slate-500">(podpis pracownika)</p>
            </div>
          </div>
          <p className="border-t pt-3 text-xs text-slate-500">Wniosek należy złożyć nie później niż 21 dni przed rozpoczęciem urlopu (rodzicielski, ojcowski, przejęcie macierzyńskiego) – termin: <b>{fmtPL(addDays(p.start, -21))}</b>. Wygenerowano w Przewodniku Rodzica – wzór pomocniczy.</p>
        </article>
      </div>
    </div>
  );
}

export default function Applications() {
  const { session, update } = useSession();
  const addApp = (title: string, to: string) => {
    const id = `${to.startsWith("Pracodawca") ? "PR" : "ZUS"}-${Date.now().toString().slice(-8)}`;
    update({ applications: [{ id, title, to, sentAt: Date.now() }, ...(session.applications ?? [])].slice(0, 20) });
    return id;
  };
  const params = useParams();
  const [form, setForm] = useState<FormKey>("zam");
  const [sent, setSent] = useState<string | null>(null);
  const [name, setName] = useState(session.user?.name ?? "");
  const [doc, setDoc] = useState<Period | null>(null);
  const [sentLeaves, setSentLeaves] = useState<Record<number, string>>({});
  const [v, setV] = useState<Record<string, string>>({ copyType: "skrócony" });
  const result = useMemo(() => (session.input ? calculate(session.input, params) : null), [session.input, params]);
  const f = FORMS[form];
  const field = (k: string, label: string, type = "text") => (
    <label className="block"><span className="label">{label}</span><input type={type} className="input" value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );

  const employeePeriods = result?.periods.filter((p) => (p.who === "mother" ? session.input!.mother : session.input!.father).title === "employment") ?? [];

  return (
    <div className={`space-y-8 ${doc ? "print:[&>*:not(:last-child)]:hidden" : ""}`}>
      <div>
        <h1>Wnioski</h1>
        <p className="text-muted">Wnioski o urlopy wypełniamy na podstawie Twojego planu. Wnioski o zasiłek – zgodnie ze wzorami ZUS.</p>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2"><Sparkles className="text-brand" size={20} /> Wnioski o urlopy do pracodawcy</h2>
          <input className="input !w-64" placeholder="Imię i nazwisko (do wniosku)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {!result ? (
          <p className="text-sm text-muted">Najpierw zaplanuj urlopy w <Link href="/kalkulator" className="text-accent font-semibold">kalkulatorze</Link> lub <Link href="/kreator" className="text-accent font-semibold">kreatorze</Link> i zapisz plan.</p>
        ) : employeePeriods.length === 0 ? (
          <p className="text-sm text-muted">W Twoim planie nikt nie pracuje na umowę o pracę – wniosków o urlop nie składa się; złóż ZAM do ZUS lub płatnika (poniżej).</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {employeePeriods.map((p, i) => (
              <li key={i} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><FileText size={18} /></span>
                <div className="flex-1">
                  <p className="font-semibold">Wniosek o udzielenie {LEAVE_NAME[p.type]} <span className="chip bg-slate-100 ml-1">{p.who === "mother" ? "matka" : "ojciec"}</span></p>
                  <p className="text-sm text-muted">{p.start} – {p.end} · {p.weeks} tyg. · złożyć do <b>{addDays(p.start, -21)}</b></p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost !py-1.5 text-sm" onClick={() => setDoc(p)}><Printer size={15} /> Podgląd</button>
                  {sentLeaves[i] ? (
                    <span className="chip bg-brand-light text-brand !py-1.5"><CheckCircle2 size={14} className="mr-1" />{sentLeaves[i]}</span>
                  ) : (
                    <button className="btn-primary !py-1.5 text-sm" onClick={() => setSentLeaves({ ...sentLeaves, [i]: `wysłano · ${addApp(`Wniosek o udzielenie ${LEAVE_NAME[p.type]}`, "Pracodawca")}` })}><Send size={15} /> Wyślij do pracodawcy</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="rounded-xl bg-brand-light p-4 text-brand flex gap-3"><CheckCircle2 /> <span>Wniosek wysłany (symulacja) do: <b>{f.to}</b>. Numer: <b>{sent}</b>. Potwierdzenie (UPO) zapisano na koncie – status śledzisz na <Link href="/pulpit" className="underline">pulpicie</Link>.</span></div>
        ) : (
          <form className="grid sm:grid-cols-2 gap-3" onSubmit={(e) => { e.preventDefault(); setSent(addApp(f.title, f.to)); }}>
            <label className="block"><span className="label">Imię i nazwisko</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            {field("pesel", "PESEL")}
            {form === "zam" && (
              <>
                {field("from", "Okres zasiłku od", "date")}
                {field("to", "do", "date")}
                {field("account", "Numer rachunku bankowego")}
                <label className="block"><span className="label">Tytuł</span><select className="input"><option>urlop macierzyński</option><option>urlop rodzicielski</option><option>urlop ojcowski</option></select></label>
                <label className="sm:col-span-2 flex gap-2 text-sm"><input type="checkbox" /> Wnoszę o zasiłek 81,5% za cały okres (do 21 dni po porodzie)</label>
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
            </div>
          </form>
        )}
      </section>

      {doc && <LeaveDocument p={doc} name={name} oneApp={!!session.input?.plan.oneApplication} onClose={() => setDoc(null)} />}
    </div>
  );
}

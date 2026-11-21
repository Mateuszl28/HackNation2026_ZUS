"use client";
import { useMemo, useState } from "react";
import { CheckCircle2, FileSignature, Printer, Send } from "lucide-react";
import { baseFromMonths, DEMO_CASES, last12Months, pln, type MonthWage } from "@zus/engine";
import { useParams } from "@/lib/session";

// Pracownicy/zleceniobiorcy z danych demo, za których płatnik wystawia Z-3 / Z-3a.
const PEOPLE = DEMO_CASES.flatMap((c) =>
  (["mother", "father"] as const)
    .filter((w) => c.input[w].title === "employment" || c.input[w].title === "mandate")
    .map((w) => ({ key: `${c.id}:${w}`, caseId: c.id, who: w, name: `${c.title.split(" – ")[0]}${w === "father" ? " (partner)" : ""}`, p: c.input[w], eventDate: c.input.eventDate })),
);
const MONTHS_PL = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

/** Zaświadczenie płatnika składek Z-3 / Z-3a – wypełniane i wysyłane do sprawy w ZUS (symulacja e-płatnika). */
export default function Z3Panel() {
  const params = useParams();
  const [key, setKey] = useState(PEOPLE[0]?.key ?? "");
  const person = PEOPLE.find((x) => x.key === key)!;
  const [rows, setRows] = useState<MonthWage[]>(() => last12Months(person.eventDate, person.p.monthlyBase));
  const [fte, setFte] = useState("1/1");
  const [preview, setPreview] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const base = useMemo(() => baseFromMonths(rows, params), [rows, params]);
  const form = person.p.title === "mandate" ? "Z-3a" : "Z-3";

  const pick = (k: string) => {
    const x = PEOPLE.find((y) => y.key === k)!;
    setKey(k);
    setRows(last12Months(x.eventDate, x.p.monthlyBase));
    setSent(null);
  };
  const send = async () => {
    const r = await fetch("/api/applications/documents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        caseId: person.caseId,
        name: `${form} – zaświadczenie płatnika składek`,
        fileName: `${form} (e-płatnik)`,
        formType: form === "Z-3" ? "Z-3 – zaświadczenie płatnika (pracownik)" : "Z-3a – zaświadczenie płatnika (zleceniobiorca)",
        fields: [
          { label: "Osoba", value: person.name },
          { label: "Ubezpieczenie od", value: person.p.insuredSince ?? "" },
          { label: "Ubezpieczenie chorobowe", value: "TAK" },
          { label: "Wymiar czasu pracy", value: fte },
          { label: "Kwota podstawy / wynagrodzenia", value: `${base.average.toFixed(2)} zł` },
          { label: `Podstawa z ${base.monthsCounted} mies. (po 13,71%)`, value: `${base.base.toFixed(2)} zł` },
        ],
      }),
    });
    if (r.ok) setSent((await r.json()).id);
  };

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2"><FileSignature size={20} className="text-accent" /> Wystaw zaświadczenie {form} do ZUS</h2>
          <p className="text-sm text-muted">Dane do ustalenia zasiłku: wynagrodzenia z 12 miesięcy, tytuł ubezpieczenia, wymiar etatu. Trafia bezpośrednio do sprawy w ZUS.</p>
        </div>
        <label className="block"><span className="label">Pracownik / zleceniobiorca</span>
          <select className="input !w-72" value={key} onChange={(e) => pick(e.target.value)}>{PEOPLE.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted">Tytuł</p><p className="font-semibold">{person.p.title === "employment" ? "Umowa o pracę" : "Umowa zlecenia"}</p><p className="text-xs text-muted">ubezpieczenie od {person.p.insuredSince ?? "—"}</p></div>
        <label className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-muted">Wymiar czasu pracy</span><select className="input mt-1 !py-1" value={fte} onChange={(e) => setFte(e.target.value)}>{["1/1", "3/4", "1/2", "1/4"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-muted">Przewidywana data porodu</p><p className="font-semibold">{person.eventDate}</p></div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-1">Miesiąc</th>{rows.map((r) => <th key={r.month} className="px-1 text-center">{MONTHS_PL[+r.month.slice(5) - 1]}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td className="py-1 pr-2 text-xs text-muted">Przychód</td>
              {rows.map((r, i) => (
                <td key={r.month} className="px-0.5"><input type="number" className="input !px-1 !py-1 text-center text-xs" value={r.gross} onChange={(e) => setRows(rows.map((x, k) => (k === i ? { ...x, gross: +e.target.value } : x)))} aria-label={`Przychód ${r.month}`} /></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm">Średnia: <b>{pln(base.average)}</b> · podstawa wymiaru zasiłku (po 13,71%): <b className="text-brand">{pln(base.base)}</b></p>

      {sent ? (
        <p className="flex items-center gap-2 rounded-xl bg-brand-light p-3 text-sm text-brand"><CheckCircle2 size={18} /> Zaświadczenie {form} ({sent}) przekazano do sprawy w ZUS – urzędnik widzi je w karcie sprawy.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={send}><Send size={16} /> Wyślij {form} do ZUS</button>
          <button className="btn-ghost" onClick={() => setPreview(true)}><Printer size={16} /> Podgląd</button>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal>
          <div className="mx-auto max-w-2xl space-y-3">
            <div className="flex justify-end gap-2"><button className="btn-primary !py-1.5 text-sm" onClick={() => window.print()}><Printer size={16} /> Drukuj</button><button className="btn-ghost !py-1.5 text-sm" onClick={() => setPreview(false)}>Zamknij</button></div>
            <article className="space-y-3 rounded-2xl bg-white p-8 font-serif text-[15px]">
              <div className="flex justify-between text-sm"><b>{form}</b><span>Zaświadczenie płatnika składek – wzór poglądowy</span></div>
              <p>Ubezpieczony: <b>{person.name}</b> · tytuł: {person.p.title === "employment" ? "umowa o pracę" : "umowa zlecenia"} · od {person.p.insuredSince} · wymiar {fte}</p>
              <p>Podlega ubezpieczeniu chorobowemu: <b>TAK</b> · płatnik zgłasza {person.p.largeEmployer ? "powyżej" : "do"} 20 ubezpieczonych</p>
              <table className="w-full text-sm"><thead className="border-b text-left"><tr><th>Miesiąc</th><th className="text-right">Przychód</th><th className="text-right">Dni przepr. / wymagane</th></tr></thead>
                <tbody>{rows.map((r) => <tr key={r.month} className="border-b border-slate-100"><td>{r.month}</td><td className="text-right">{pln(r.gross)}</td><td className="text-right">{r.workedDays}/{r.requiredDays}</td></tr>)}</tbody></table>
              <p>Przeciętne wynagrodzenie: <b>{pln(base.average)}</b>; podstawa wymiaru po odliczeniu 13,71%: <b>{pln(base.base)}</b></p>
              <div className="flex justify-end pt-6 text-center text-xs"><div><p className="border-b border-dotted border-slate-400 min-w-56">&nbsp;</p><p className="text-slate-500">podpis płatnika składek</p></div></div>
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

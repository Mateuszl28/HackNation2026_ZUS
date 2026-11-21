import type { DemoCase } from "@zus/engine";
import type { StoredDocument } from "@/lib/cases-store";

// Kontrola krzyżowa: dane odczytane z dokumentów obywatela vs dane w systemach ZUS (reguły, bez AI).
export interface CrossCheck {
  level: "ok" | "warning" | "danger";
  text: string;
  doc?: string;
}

const num = (v: string) => parseFloat(v.replace(/[^\d,.-]/g, "").replace(",", "."));

export function crossCheck(c: DemoCase, docs: StoredDocument[]): CrossCheck[] {
  const out: CrossCheck[] = [];
  const zusBase = c.zusData.insurance[0]?.base;
  const insuredInZus = c.zusData.insurance.some((i) => i.sickness !== "brak" && (!i.to || i.to >= c.input.eventDate));
  for (const d of docs) {
    const f = Object.fromEntries((d.fields ?? []).map((x) => [x.label, x.value]));
    const amountKey = Object.keys(f).find((k) => k.startsWith("Kwota podstawy") || k.startsWith("Podstawa z"));
    if (amountKey && zusBase) {
      const v = num(f[amountKey]);
      const diff = Math.abs(v - zusBase) / zusBase;
      if (Number.isFinite(v)) out.push(diff > 0.1 ? { level: "warning", doc: d.name, text: `Kwota w dokumencie (${v.toFixed(2)} zł) różni się o ${Math.round(diff * 100)}% od podstawy składek w ZUS (${zusBase.toFixed(2)} zł) – sprawdź składniki wynagrodzenia lub zmiany podstawy w okresie ciąży.` } : { level: "ok", doc: d.name, text: `Kwota zgodna z podstawą w ZUS (różnica ${Math.round(diff * 100)}%).` });
    }
    if (f["Ubezpieczenie chorobowe"]) {
      const docIns = f["Ubezpieczenie chorobowe"] === "TAK";
      out.push(docIns === insuredInZus ? { level: "ok", doc: d.name, text: "Status ubezpieczenia chorobowego zgodny z danymi ZUS." } : { level: "danger", doc: d.name, text: `Dokument wskazuje ubezpieczenie chorobowe: ${docIns ? "TAK" : "NIE"}, a dane ZUS: ${insuredInZus ? "TAK" : "NIE"} – wyjaśnij z płatnikiem.` });
    }
    if (f["Ubezpieczenie od"] && c.input.mother.insuredSince && f["Ubezpieczenie od"] !== c.input.mother.insuredSince)
      out.push({ level: "warning", doc: d.name, text: `Data początku ubezpieczenia w dokumencie (${f["Ubezpieczenie od"]}) inna niż w ZUS (${c.input.mother.insuredSince}).` });
    if (d.formType && /zlikwidowany/i.test(d.formType)) out.push({ level: "warning", doc: d.name, text: `${d.formType} – poproś o ZAM.` });
  }
  return out;
}

/** Termin załatwienia sprawy: 30 dni od wpływu ostatniego wniosku/dokumentu (ZUS wypłaca zasiłek nie później niż w 30 dni od wyjaśnienia ostatniej okoliczności). */
export function sla(waitingSince: number | null, now = Date.now()) {
  if (!waitingSince) return null;
  const days = Math.floor((now - waitingSince) / 86400000);
  const left = 30 - days;
  return { days, left, deadline: new Date(waitingSince + 30 * 86400000).toISOString().slice(0, 10), level: left < 0 ? "danger" : left <= 7 ? "warning" : "ok" } as const;
}

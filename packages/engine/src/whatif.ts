import { addDays, calculate, diffDays, type CalcInput, type InsuranceTitle, type Notice, type Who } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Symulator zmian w warunkach zatrudnienia w okresie ciąży – skutek dla prawa i wysokości zasiłku + ryzyka.

export type ChangeKind = "raise" | "endContract" | "newContract" | "stopVoluntary";

export interface Change {
  kind: ChangeKind;
  who: Who;
  date: string; // data zmiany
  newGross?: number; // raise / newContract
  newTitle?: InsuranceTitle; // newContract
  fixedTerm?: boolean; // endContract – umowa na czas określony
  pregnancyStart?: string; // endContract – do oceny art. 177 § 3 KP
}

export interface WhatIfResult {
  before: number;
  after: number;
  diff: number;
  afterInput: CalcInput;
  baseNote?: string;
  risks: Notice[];
}

/** Pełne miesiące kalendarzowe od miesiąca zmiany (gdy zmiana od 1. dnia – włącznie) do miesiąca poprzedzającego `to`. */
const monthsBetween = (from: string, to: string) => {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return Math.max(0, y2 * 12 + m2 - (y1 * 12 + m1) - (d1 > 1 ? 1 : 0));
};

export function whatIf(input: CalcInput, ch: Change, params: Params = DEFAULT_PARAMS): WhatIfResult {
  const before = calculate(input, params).total;
  const after: CalcInput = structuredClone(input);
  const p = after[ch.who];
  const risks: Notice[] = [];
  let baseNote: string | undefined;
  const ev = input.eventDate;
  const name = ch.who === "mother" ? "Matka" : "Ojciec";

  switch (ch.kind) {
    case "raise": {
      const old = p.monthlyBase;
      const nw = ch.newGross ?? old;
      // podstawa = średnia z 12 pełnych miesięcy przed miesiącem porodu → podwyżka liczy się proporcjonalnie
      const monthsAtNew = Math.min(12, monthsBetween(ch.date, ev.slice(0, 8) + "01"));
      const effective = (old * (12 - monthsAtNew) + nw * monthsAtNew) / 12;
      p.monthlyBase = Math.round(effective * 100) / 100;
      p.baseAlreadyNet = false;
      baseNote = `Podstawa to średnia z 12 miesięcy przed miesiącem porodu: ${monthsAtNew} mies. po podwyżce i ${12 - monthsAtNew} przed – średnie wynagrodzenie ${effective.toFixed(2)} zł zamiast ${nw.toFixed(2)} zł.`;
      const growth = old ? (nw - old) / old : 0;
      if (growth > 0.3)
        risks.push({ level: "warning", title: "Wysoka podwyżka w ciąży", text: `Wzrost o ${Math.round(growth * 100)}%. ZUS może zbadać, czy podwyżka odpowiada rzeczywistej pracy – jeśli uzna, że miała na celu wyłącznie wyższy zasiłek, ustali niższą podstawę.` });
      if (p.title === "business")
        risks.push({ level: "warning", title: "Podwyższenie deklarowanej podstawy (działalność)", text: "Gwałtowne podniesienie podstawy składek w ciąży jest częstym powodem kontroli ZUS – podstawa powinna odpowiadać realnym przychodom." });
      break;
    }
    case "endContract": {
      const protectedByKP = ch.fixedTerm && p.title === "employment" && ch.pregnancyStart && diffDays(ch.pregnancyStart, ch.date) > 91;
      if (protectedByKP) {
        risks.push({ level: "info", title: "Umowa przedłuża się do dnia porodu (art. 177 § 3 KP)", text: "Umowa na czas określony, która ustałaby po upływie 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu – prawo do zasiłku macierzyńskiego zostaje zachowane." });
      } else {
        p.insuredUntil = ch.date;
        if (ch.date < ev) {
          risks.push({ level: "danger", title: `${name}: brak ubezpieczenia w dniu porodu`, text: "Zakończenie umowy przed porodem oznacza brak prawa do zasiłku macierzyńskiego (wyjątki: upadłość/likwidacja pracodawcy). Rozważ: przedłużenie umowy, dobrowolne ubezpieczenie chorobowe na zleceniu lub w działalności (bez okresu wyczekiwania dla macierzyńskiego)." });
          if (p.title === "employment") risks.push({ level: "info", title: "Wyjątek: likwidacja/upadłość", text: "Jeśli umowa ustaje z powodu upadłości lub likwidacji pracodawcy – przysługuje zasiłek w wysokości zasiłku macierzyńskiego do porodu, a potem macierzyński." });
        }
      }
      break;
    }
    case "newContract": {
      const t = ch.newTitle ?? "mandate";
      p.title = t;
      p.monthlyBase = ch.newGross ?? p.monthlyBase;
      p.insuredSince = ch.date;
      p.insuredUntil = undefined;
      const days = diffDays(ch.date, ev);
      if (days < 0) risks.push({ level: "danger", title: "Umowa po porodzie", text: "Ubezpieczenie musi trwać w dniu porodu, aby nabyć prawo do zasiłku macierzyńskiego." });
      else {
        if (days < 180) risks.push({ level: "warning", title: "Krótki okres ubezpieczenia przed porodem", text: "ZUS może sprawdzić, czy umowa/działalność nie została zawarta dla pozoru (tylko w celu uzyskania zasiłku). Gromadź dowody faktycznego wykonywania pracy (umowy, faktury, korespondencja)." });
        risks.push({ level: "info", title: "Podstawa przy krótkim ubezpieczeniu", text: `Przy ubezpieczeniu krótszym niż 12 miesięcy podstawę liczy się z pełnych miesięcy ubezpieczenia (od ${ch.date} – ok. ${monthsBetween(ch.date, ev)} mies.). Zasiłek macierzyński nie ma okresu wyczekiwania, ale chorobowy w ciąży – ${t === "employment" ? params.waitingPeriodDays.mandatory : params.waitingPeriodDays.voluntary} dni.` });
        if (t !== "employment") risks.push({ level: "info", title: "Dobrowolne ubezpieczenie chorobowe", text: "Na zleceniu i w działalności zgłoś się do dobrowolnego ubezpieczenia chorobowego i opłacaj składki w terminie – spóźnienie powoduje ustanie ubezpieczenia." });
      }
      break;
    }
    case "stopVoluntary": {
      p.insuredUntil = addDays(ch.date, -1);
      if (ch.date <= ev) risks.push({ level: "danger", title: `${name}: rezygnacja z dobrowolnego chorobowego`, text: "Bez ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie przysługuje – ponowne zgłoszenie nie przywraca prawa wstecz." });
      break;
    }
  }

  const res = calculate(after, params);
  for (const n of res.notices) if (n.level === "danger" && !risks.some((r) => r.title === n.title)) risks.push(n);
  return { before, after: res.total, diff: Math.round((res.total - before) * 100) / 100, afterInput: after, baseNote, risks };
}

"use client";
import { useMemo } from "react";
import type { Deadline, Period } from "@zus/engine";

const COLOR: Record<string, string> = {
  maternity: "bg-brand text-white",
  maternityFather: "bg-sky-600 text-white",
  adoptionMaternity: "bg-brand text-white",
  supplementary: "bg-emerald-400 text-white",
  parental: "bg-teal-600 text-white",
  paternity: "bg-indigo-500 text-white",
};
const LEGEND: [string, string][] = [["maternity", "Macierzyński"], ["maternityFather", "Macierzyński – ojciec"], ["supplementary", "Uzupełniający"], ["parental", "Rodzicielski"], ["paternity", "Ojcowski"]];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Widok miesięczny planu: dni urlopów (kolor wg rodzaju; ojcowski ma pierwszeństwo przy nakładaniu) + terminy. */
export default function PlanCalendar({ periods, deadlines, eventDate, today }: { periods: Period[]; deadlines: Deadline[]; eventDate: string; today: string }) {
  const months = useMemo(() => {
    const dates = [...periods.flatMap((p) => [p.start, p.end]), ...deadlines.map((d) => d.date), eventDate].filter((d) => d >= today.slice(0, 8) + "01").sort();
    const start = dates[0] ?? today;
    let y = +start.slice(0, 4);
    let m = +start.slice(5, 7) - 1;
    const out: { y: number; m: number }[] = [];
    for (let i = 0; i < 12; i++) {
      out.push({ y, m });
      if (++m === 12) { m = 0; y++; }
    }
    return out;
  }, [periods, deadlines, eventDate, today]);

  const typeOn = (day: string) => {
    const hits = periods.filter((p) => p.start <= day && day <= p.end);
    return (hits.find((p) => p.type === "paternity") ?? hits[0])?.type;
  };
  const deadlineOn = (day: string) => deadlines.find((d) => d.date === day);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGEND.map(([k, l]) => <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${COLOR[k].split(" ")[0]}`} />{l}</span>)}
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full ring-2 ring-red-500" />Termin</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-300" />Poród / przyjęcie</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {months.map(({ y, m }) => {
          const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // pn = 0
          const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
          return (
            <div key={`${y}-${m}`} className="rounded-xl border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">{MONTHS[m]} {y}</p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]" role="grid" aria-label={`${MONTHS[m]} ${y}`}>
                {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => <span key={d} className="pb-1 text-muted">{d}</span>)}
                {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
                {Array.from({ length: days }, (_, i) => {
                  const day = iso(y, m, i + 1);
                  const t = typeOn(day);
                  const dl = deadlineOn(day);
                  const isEvent = day === eventDate;
                  const label = [day, t && LEGEND.find(([k]) => k === t)?.[1], dl?.title, isEvent && "poród / przyjęcie dziecka"].filter(Boolean).join(" · ");
                  return (
                    <span key={day} title={label} aria-label={label} className={`relative grid aspect-square place-items-center rounded ${isEvent ? "bg-amber-300 font-bold text-ink" : t ? COLOR[t] : day === today ? "ring-1 ring-accent" : ""} ${dl ? "ring-2 ring-red-500" : ""}`}>
                      {i + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Baby, Briefcase, CalendarHeart, HeartPulse, ShieldAlert, Stethoscope } from "lucide-react";

const STEPS = [
  { icon: CalendarHeart, title: "Planowanie i ciąża – sprawdź ubezpieczenie", items: [
    "Zasiłki przysługują tylko osobom podlegającym ubezpieczeniu chorobowemu (umowa o pracę – obowiązkowo; zlecenie i działalność – dobrowolnie).",
    "Okres wyczekiwania na zasiłek chorobowy: 30 dni (obowiązkowe) lub 90 dni (dobrowolne). Zasiłek macierzyński nie ma okresu wyczekiwania.",
    "Przedsiębiorco: opłacaj składki w terminie – spóźnienie powoduje ustanie dobrowolnego ubezpieczenia chorobowego.",
  ] },
  { icon: Stethoscope, title: "Zwolnienie lekarskie w ciąży", items: [
    "Lekarz wystawia e-ZLA z kodem „B” – zasiłek wynosi 100% podstawy.",
    "Pracownica: pierwsze 33 dni w roku (14 po 50. r.ż.) płaci pracodawca jako wynagrodzenie chorobowe, potem zasiłek.",
    "Zleceniobiorczyni / przedsiębiorczyni: zasiłek od 1. dnia; przedsiębiorczyni składa ZAS-53 (jeśli wymagany), zleceniobiorczyni – płatnik przekazuje Z-3a.",
    "Maksymalnie 270 dni (okres zasiłkowy). Jeśli L4 trwa do porodu – od porodu zaczyna się zasiłek macierzyński.",
  ] },
  { icon: Baby, title: "Poród – urlop macierzyński", items: [
    "20 tyg. (1 dziecko), 31/33/35/37 tyg. przy ciąży mnogiej. Do 6 tyg. można wykorzystać przed porodem.",
    "14 tygodni po porodzie matka wykorzystuje obowiązkowo; resztę może przejąć ojciec.",
    "Wcześniak lub hospitalizacja noworodka – uzupełniający urlop macierzyński (do 3/8/15 tyg.).",
    "Złóż wniosek u pracodawcy (pracownica) lub ZAM w ZUS (zlecenie / działalność). Dołącz skrócony akt urodzenia.",
    "Do 21 dni po porodzie możesz wybrać 81,5% za cały okres zamiast 100% + 70%.",
  ] },
  { icon: HeartPulse, title: "Urlop rodzicielski i ojcowski", items: [
    "41 tyg. (1 dziecko) lub 43 tyg. (więcej dzieci); z zaświadczeniem „Za życiem” 65/67 tyg. Zasiłek 70%.",
    "Po 9 tygodni nieprzenoszalnych dla każdego rodzica. Do 5 części, do końca roku, w którym dziecko kończy 6 lat.",
    "Rodzice mogą korzystać jednocześnie lub naprzemiennie. Wniosek do pracodawcy min. 21 dni przed.",
    "Urlop ojcowski: 14 dni (jednorazowo lub 2×7), do ukończenia przez dziecko 12 miesięcy, 100%.",
  ] },
  { icon: Briefcase, title: "Powrót do pracy", items: [
    "Rodzicielski można łączyć z pracą do 1/2 etatu – urlop wydłuża się proporcjonalnie, zasiłek proporcjonalnie maleje.",
    "Ochrona przed zwolnieniem trwa w ciąży i przez urlopy związane z rodzicielstwem (od dnia złożenia wniosku).",
    "Umowa na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.",
  ] },
];

const RISKS = [
  "Umowa lub działalność zawarta „dla pozoru” tuż przed ciążą/porodem – ZUS może stwierdzić niepodleganie ubezpieczeniom.",
  "Znaczne podwyższenie podstawy składek w ciąży – ZUS może obniżyć podstawę wymiaru zasiłku.",
  "Brak ubezpieczenia chorobowego w dniu porodu (koniec umowy, zamknięcie działalności, niezgłoszenie do dobrowolnego) – brak zasiłku macierzyńskiego.",
  "Zadłużenie składkowe przedsiębiorcy – zasiłek wypłacany dopiero po spłacie.",
  "Wybór 81,5% bez wykorzystania pełnego rodzicielskiego – wyrównanie (potrącenie) do 70%.",
  "Niewykorzystane 9 tygodni ojca przepadają.",
];

export default function Guide() {
  return (
    <div className="space-y-8">
      <div>
        <h1>Przewodnik krok po kroku</h1>
        <p className="text-muted">Od planowania ciąży do powrotu do pracy. Szczegóły dla Twojej sytuacji wylicza kalkulator.</p>
      </div>
      <ol className="relative border-l-2 border-brand/30 ml-4 space-y-8">
        {STEPS.map((s, i) => (
          <li key={i} className="pl-8 relative">
            <span className="absolute -left-[21px] top-0 grid h-10 w-10 place-items-center rounded-full bg-brand text-white"><s.icon size={20} /></span>
            <div className="card">
              <h2>{i + 1}. {s.title}</h2>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </li>
        ))}
      </ol>
      <section className="card border-amber-200 bg-amber-50">
        <h2 className="flex items-center gap-2"><ShieldAlert className="text-amber-600" /> Zagrożenia – możesz stracić lub obniżyć świadczenie</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">{RISKS.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </div>
  );
}

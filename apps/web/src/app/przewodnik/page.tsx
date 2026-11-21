"use client";
import { useEffect, useState } from "react";
import { Baby, Briefcase, CalendarHeart, HeartPulse, Languages, ShieldAlert, Stethoscope } from "lucide-react";

type Lang = "pl" | "uk" | "en";
const ICONS = [CalendarHeart, Stethoscope, Baby, HeartPulse, Briefcase];

const T: Record<Lang, { title: string; lead: string; risksTitle: string; note: string; steps: { title: string; items: string[] }[]; risks: string[] }> = {
  pl: {
    title: "Przewodnik krok po kroku",
    lead: "Od planowania ciąży do powrotu do pracy. Szczegóły dla Twojej sytuacji wylicza kalkulator.",
    risksTitle: "Zagrożenia – możesz stracić lub obniżyć świadczenie",
    note: "Narzędzie informacyjne – wiążące decyzje wydaje ZUS lub płatnik składek.",
    steps: [
      { title: "Planowanie i ciąża – sprawdź ubezpieczenie", items: [
        "Zasiłki przysługują tylko osobom podlegającym ubezpieczeniu chorobowemu (umowa o pracę – obowiązkowo; zlecenie i działalność – dobrowolnie).",
        "Okres wyczekiwania na zasiłek chorobowy: 30 dni (obowiązkowe) lub 90 dni (dobrowolne). Zasiłek macierzyński nie ma okresu wyczekiwania.",
        "Przedsiębiorco: opłacaj składki w terminie – spóźnienie powoduje ustanie dobrowolnego ubezpieczenia chorobowego.",
      ] },
      { title: "Zwolnienie lekarskie w ciąży", items: [
        "Lekarz wystawia e-ZLA z kodem „B” – zasiłek wynosi 100% podstawy.",
        "Pracownica: pierwsze 33 dni w roku (14 po 50. r.ż.) płaci pracodawca jako wynagrodzenie chorobowe, potem zasiłek.",
        "Maksymalnie 270 dni (okres zasiłkowy), potem świadczenie rehabilitacyjne (w ciąży 100%).",
        "Utrata pracy w ciąży przez upadłość lub likwidację pracodawcy – zasiłek w wysokości zasiłku macierzyńskiego do porodu.",
      ] },
      { title: "Poród – urlop macierzyński", items: [
        "20 tyg. (1 dziecko), 31/33/35/37 tyg. przy ciąży mnogiej. Do 6 tyg. można wykorzystać przed porodem.",
        "14 tygodni po porodzie matka wykorzystuje obowiązkowo; resztę może przejąć ojciec.",
        "Wcześniak lub hospitalizacja noworodka – uzupełniający urlop macierzyński (do 8 lub 15 tyg., zależnie od tygodnia ciąży i masy urodzeniowej).",
        "Złóż wniosek u pracodawcy (pracownica) lub ZAM w ZUS (zlecenie / działalność). Dołącz skrócony akt urodzenia.",
        "Do 21 dni po porodzie możesz wybrać 81,5% za cały okres zamiast 100% + 70%.",
      ] },
      { title: "Urlop rodzicielski i ojcowski", items: [
        "41 tyg. (1 dziecko) lub 43 tyg. (więcej dzieci); z zaświadczeniem „Za życiem” 65/67 tyg. Zasiłek 70%.",
        "Po 9 tygodni nieprzenoszalnych dla każdego rodzica. Do 5 części, do końca roku, w którym dziecko kończy 6 lat.",
        "Rodzice mogą korzystać jednocześnie lub naprzemiennie. Wniosek do pracodawcy min. 21 dni przed.",
        "Urlop ojcowski: 14 dni (jednorazowo lub 2×7), do ukończenia przez dziecko 12 miesięcy, 100%.",
      ] },
      { title: "Powrót do pracy", items: [
        "Rodzicielski można łączyć z pracą do 1/2 etatu – urlop wydłuża się proporcjonalnie, zasiłek proporcjonalnie maleje.",
        "Ochrona przed zwolnieniem trwa w ciąży i przez urlopy związane z rodzicielstwem (od dnia złożenia wniosku).",
        "Umowa na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.",
      ] },
    ],
    risks: [
      "Umowa lub działalność zawarta „dla pozoru” tuż przed ciążą/porodem – ZUS może stwierdzić niepodleganie ubezpieczeniom.",
      "Znaczne podwyższenie podstawy składek w ciąży – ZUS może obniżyć podstawę wymiaru zasiłku.",
      "Brak ubezpieczenia chorobowego w dniu porodu (koniec umowy, zamknięcie działalności, niezgłoszenie do dobrowolnego) – brak zasiłku macierzyńskiego.",
      "Zadłużenie składkowe przedsiębiorcy – zasiłek wypłacany dopiero po spłacie.",
      "Przy 81,5%: jeśli w pierwszym roku życia dziecka nie wykorzystasz ani dnia rodzicielskiego, rodzicielski spada do 70% (za macierzyński – wyrównanie do 100%).",
      "Niewykorzystane 9 tygodni drugiego rodzica przepadają.",
    ],
  },
  uk: {
    title: "Покроковий путівник",
    lead: "Від планування вагітності до повернення на роботу. Розрахунок для вашої ситуації – у калькуляторі (польською мовою).",
    risksTitle: "Ризики – ви можете втратити допомогу або отримати меншу суму",
    note: "Інформаційний інструмент – обов'язкові рішення ухвалює ZUS або платник внесків (роботодавець).",
    steps: [
      { title: "Планування і вагітність – перевірте страхування", items: [
        "Допомога належить лише особам, які мають страхування на випадок хвороби (umowa o pracę – обов'язково; umowa zlecenia та підприємницька діяльність – добровільно).",
        "Період очікування для лікарняної допомоги: 30 днів (обов'язкове страхування) або 90 днів (добровільне). Для допомоги у зв'язку з материнством (zasiłek macierzyński) періоду очікування немає.",
        "Підприємцям: сплачуйте внески вчасно – запізнення припиняє добровільне страхування на випадок хвороби.",
      ] },
      { title: "Лікарняний під час вагітності", items: [
        "Лікар видає електронний лікарняний e-ZLA з кодом «B» – допомога становить 100% бази.",
        "Працівниця: перші 33 дні на рік (14 днів після 50 років) оплачує роботодавець, далі – допомога з ZUS.",
        "Максимум 270 днів, потім реабілітаційна допомога (świadczenie rehabilitacyjne, під час вагітності – 100%).",
        "Втрата роботи під час вагітності через банкрутство або ліквідацію роботодавця – допомога в розмірі материнської до пологів.",
      ] },
      { title: "Пологи – відпустка у зв'язку з материнством", items: [
        "20 тижнів (1 дитина), 31/33/35/37 тижнів при багатоплідній вагітності. До 6 тижнів можна використати до пологів.",
        "Перші 14 тижнів після пологів мати використовує обов'язково; решту може перейняти батько.",
        "Недоношена дитина або госпіталізація новонародженого – додаткова відпустка (uzupełniający urlop macierzyński), до 8 або 15 тижнів.",
        "Подайте заяву роботодавцю (працівниця) або форму ZAM до ZUS (umowa zlecenia / підприємництво). Додайте скорочене свідоцтво про народження.",
        "Протягом 21 дня після пологів можна обрати 81,5% за весь період замість 100% + 70%.",
      ] },
      { title: "Батьківська відпустка та відпустка батька", items: [
        "41 тиждень (1 дитина) або 43 тижні (більше дітей); з довідкою «Za życiem» – 65/67 тижнів. Допомога 70%.",
        "Кожен із батьків має 9 тижнів, які не можна передати іншому. До 5 частин, до кінця року, в якому дитині виповнюється 6 років.",
        "Батьки можуть брати відпустку одночасно або по черзі. Заява роботодавцю – щонайменше за 21 день.",
        "Відпустка батька (urlop ojcowski): 14 днів (одразу або 2×7) до досягнення дитиною 12 місяців, 100%.",
      ] },
      { title: "Повернення на роботу", items: [
        "Батьківську відпустку можна поєднувати з роботою до 1/2 ставки – відпустка пропорційно подовжується, а допомога зменшується.",
        "Захист від звільнення діє під час вагітності та відпусток, пов'язаних з батьківством.",
        "Строковий трудовий договір, який закінчився б після 3-го місяця вагітності, продовжується до дня пологів.",
      ] },
    ],
    risks: [
      "Договір або підприємництво, укладені «для вигляду» перед вагітністю/пологами – ZUS може визнати, що страхування немає.",
      "Значне підвищення бази внесків під час вагітності – ZUS може зменшити базу для розрахунку допомоги.",
      "Відсутність страхування на випадок хвороби в день пологів (кінець договору, закриття діяльності) – немає материнської допомоги.",
      "Борг підприємця за внесками – допомогу виплатять лише після його погашення.",
      "Незадіяні 9 тижнів іншого з батьків пропадають.",
    ],
  },
  en: {
    title: "Step-by-step guide",
    lead: "From planning a pregnancy to returning to work. The calculator (in Polish) computes amounts for your situation.",
    risksTitle: "Risks – you may lose or reduce your benefit",
    note: "Information tool – binding decisions are issued by ZUS or the contribution payer (employer).",
    steps: [
      { title: "Planning and pregnancy – check your insurance", items: [
        "Benefits are available only to people covered by sickness insurance (employment contract – mandatory; civil-law contract and self-employment – voluntary).",
        "Waiting period for sickness benefit: 30 days (mandatory) or 90 days (voluntary). Maternity benefit has no waiting period.",
        "Self-employed: pay contributions on time – a late payment ends voluntary sickness insurance.",
      ] },
      { title: "Sick leave during pregnancy", items: [
        "Your doctor issues an e-ZLA with code “B” – the benefit is 100% of the base.",
        "Employees: the employer pays for the first 33 days a year (14 days after age 50), then ZUS sickness benefit.",
        "Up to 270 days, then rehabilitation benefit (100% during pregnancy).",
        "Losing your job during pregnancy due to employer bankruptcy or liquidation – a benefit equal to maternity benefit until birth.",
      ] },
      { title: "Birth – maternity leave", items: [
        "20 weeks (1 child), 31/33/35/37 weeks for multiple births. Up to 6 weeks can be taken before birth.",
        "The mother must take 14 weeks after birth; the father may take over the rest.",
        "Premature baby or newborn hospitalisation – supplementary maternity leave (up to 8 or 15 weeks).",
        "Apply to your employer (employees) or file form ZAM with ZUS (civil-law contract / self-employed). Attach the short birth certificate.",
        "Within 21 days after birth you can choose 81.5% for the whole period instead of 100% + 70%.",
      ] },
      { title: "Parental and paternity leave", items: [
        "41 weeks (1 child) or 43 weeks (more children); with a “Za życiem” certificate 65/67 weeks. Benefit 70%.",
        "Each parent has 9 non-transferable weeks. Up to 5 parts, until the end of the year the child turns 6.",
        "Parents can take it at the same time or alternately. Apply to the employer at least 21 days in advance.",
        "Paternity leave: 14 days (at once or 2×7) until the child is 12 months old, 100%.",
      ] },
      { title: "Returning to work", items: [
        "Parental leave can be combined with work up to half-time – the leave is extended and the benefit reduced proportionally.",
        "Protection against dismissal applies during pregnancy and parenthood-related leave.",
        "A fixed-term contract that would end after the 3rd month of pregnancy is extended until the birth.",
      ] },
    ],
    risks: [
      "A sham contract or business started just before pregnancy/birth – ZUS may decide you were not insured.",
      "A large increase of the contribution base during pregnancy – ZUS may lower the benefit base.",
      "No sickness insurance on the day of birth (contract ended, business closed) – no maternity benefit.",
      "Contribution debt of the self-employed – the benefit is paid only after it is settled.",
      "Unused 9 weeks of the other parent are lost.",
    ],
  },
};

const LANGS: [Lang, string][] = [["pl", "Polski"], ["uk", "Українська"], ["en", "English"]];

export default function Guide() {
  const [lang, setLang] = useState<Lang>("pl");
  useEffect(() => {
    try {
      const l = localStorage.getItem("zpr-guide-lang") as Lang | null;
      if (l && l in T) setLang(l);
    } catch {}
  }, []);
  const choose = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem("zpr-guide-lang", l);
    } catch {}
  };
  const t = T[lang];

  return (
    <div className="space-y-8" lang={lang}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{t.title}</h1>
          <p className="text-muted">{t.lead}</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-200 p-1 text-sm" role="group" aria-label="Język / Мова / Language">
          <Languages size={16} className="mx-1 text-muted" />
          {LANGS.map(([l, label]) => (
            <button key={l} onClick={() => choose(l)} aria-pressed={lang === l} className={`rounded-lg px-3 py-1.5 ${lang === l ? "bg-white font-semibold shadow" : ""}`}>{label}</button>
          ))}
        </div>
      </div>
      <ol className="relative ml-4 space-y-8 border-l-2 border-brand/30">
        {t.steps.map((s, i) => {
          const Icon = ICONS[i];
          return (
            <li key={i} className="relative pl-8">
              <span className="absolute -left-[21px] top-0 grid h-10 w-10 place-items-center rounded-full bg-brand text-white"><Icon size={20} /></span>
              <div className="card">
                <h2>{i + 1}. {s.title}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{s.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </li>
          );
        })}
      </ol>
      <section className="card border-amber-200 bg-amber-50">
        <h2 className="flex items-center gap-2"><ShieldAlert className="text-amber-600" /> {t.risksTitle}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{t.risks.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
      <p className="text-xs text-muted">{t.note}</p>
    </div>
  );
}

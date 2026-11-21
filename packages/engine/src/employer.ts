import { addDays, calculate, computeBase, type CalcInput } from "./calculator.ts";
import { DEFAULT_PARAMS, type Params } from "./params.ts";

// Perspektywa płatnika składek (pracodawcy): kto wypłaca zasiłek, koszty pracodawcy, obowiązki i terminy.

export interface EmployerInput {
  insuredCount: number; // liczba zgłoszonych do ubezpieczenia chorobowego wg stanu na 30 listopada poprzedniego roku
  monthlyGross: number;
  employeeAge?: number;
  dueDate: string;
  sickDays?: number; // przewidywane L4 w ciąży
  usedSickDaysThisYear?: number;
  leave: CalcInput["plan"];
}

export interface EmployerTask {
  when: string;
  title: string;
  description: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function employerView(i: EmployerInput, params: Params = DEFAULT_PARAMS) {
  const paysBenefits = i.insuredCount > 20;
  const employee = { title: "employment" as const, monthlyBase: i.monthlyGross, largeEmployer: paysBenefits, age: i.employeeAge };
  const base = computeBase(employee, params);
  const daily = base / 30;
  const limit = (i.employeeAge ?? 30) >= 50 ? params.employerPaidDays.over50 : params.employerPaidDays.under50;
  const sickDays = i.sickDays ?? 0;
  const employerSickDays = Math.max(0, Math.min(sickDays, limit - (i.usedSickDaysThisYear ?? 0)));
  const benefitSickDays = Math.max(0, Math.min(sickDays, params.sicknessPeriodDays) - employerSickDays);

  const calc = calculate({ scenario: "birth", eventDate: i.dueDate, children: 1, mother: employee, father: { title: "none", monthlyBase: 0 }, plan: i.leave }, params);
  const motherPeriods = calc.periods.filter((p) => p.who === "mother");
  const benefitsTotal = r2(motherPeriods.reduce((s, p) => s + p.total, 0) + daily * params.rates.sicknessPregnancy * benefitSickDays);

  const tasks: EmployerTask[] = [];
  const firstParental = motherPeriods.find((p) => p.type === "parental");
  tasks.push({ when: "Od zawiadomienia o ciąży", title: "Szczególna ochrona stosunku pracy", description: "Zakaz wypowiedzenia i rozwiązania umowy (wyjątki: upadłość/likwidacja, zawinione rozwiązanie za zgodą związków). Umowa na czas określony, która ustałaby po 3. miesiącu ciąży, przedłuża się do dnia porodu. Zakaz prac wzbronionych kobietom w ciąży, nadgodzin i pracy w nocy." });
  if (sickDays) tasks.push({ when: "Po otrzymaniu e-ZLA (PUE/eZUS)", title: `Wynagrodzenie chorobowe – ${employerSickDays} dni`, description: `Pierwsze ${limit} dni niezdolności w roku kalendarzowym finansuje pracodawca (w ciąży – kod B – 100%). ${paysBenefits ? "Dalej sam wypłacasz zasiłek chorobowy z FUS." : "Dalej zasiłek wypłaca ZUS – przekaż Z-3 (pierwszy okres) i ZAS-12 (kolejne)."}` });
  tasks.push({ when: "Po otrzymaniu wniosku o urlop", title: "Udziel urlopu macierzyńskiego", description: "Wniosek o urlop macierzyński może obejmować także rodzicielski (jeden wniosek). Pracownica może zacząć do 6 tygodni przed porodem na podstawie zaświadczenia lekarskiego." });
  tasks.push({
    when: "Po porodzie",
    title: paysBenefits ? "Ustal prawo i wypłacaj zasiłek macierzyński" : "Przekaż Z-3 do ZUS",
    description: paysBenefits
      ? "Jako płatnik zgłaszający > 20 ubezpieczonych ustalasz prawo i wysokość zasiłku oraz wypłacasz go w terminie wypłaty wynagrodzeń; wypłacone kwoty rozliczasz w deklaracji ZUS DRA (pomniejszają składki)."
      : "ZUS ustala prawo i wypłaca zasiłek. Prześlij zaświadczenie płatnika składek Z-3 (wynagrodzenia z 12 mies., okresy urlopów) wraz z wnioskiem i aktem urodzenia – najlepiej elektronicznie przez PUE/eZUS.",
  });
  if (firstParental) tasks.push({ when: `do ${addDays(firstParental.start, -21)}`, title: "Wniosek o urlop rodzicielski (21 dni przed)", description: "Pracownica składa wniosek min. 21 dni przed rozpoczęciem. Wniosek o łączenie urlopu z pracą (≤ 1/2 etatu) jest dla pracodawcy wiążący, chyba że organizacja pracy na to nie pozwala." });
  tasks.push({ when: "Po urlopie", title: "Powrót do pracy na dotychczasowe stanowisko", description: "Obowiązek dopuszczenia do pracy na dotychczasowym (lub równorzędnym) stanowisku z wynagrodzeniem nie niższym. Pracownik może wnioskować o obniżenie wymiaru czasu pracy lub elastyczną organizację pracy." });

  return {
    paysBenefits,
    payerLabel: paysBenefits ? "Pracodawca (płatnik > 20 ubezpieczonych)" : "ZUS",
    base: r2(base),
    employerSickDays,
    employerSickCost: r2(daily * params.rates.sicknessPregnancy * employerSickDays),
    benefitSickDays,
    benefitsTotal,
    benefitsFromFUS: true,
    periods: motherPeriods,
    tasks,
  };
}

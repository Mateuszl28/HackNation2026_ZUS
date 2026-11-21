// Parametry prawne – edytowalne w panelu administracyjnym (zmiany legislacyjne).
// Źródło: ustawa zasiłkowa, Kodeks pracy (stan 2026). Wartości oznaczone `verify` warto potwierdzić z mentorami ZUS.

export interface Params {
  version: string;
  updatedAt: string;
  rates: {
    maternity: number; // urlop macierzyński / na warunkach / uzupełniający / ojcowski
    parental: number; // urlop rodzicielski
    oneApplication: number; // wniosek do 21 dni po porodzie (cały okres)
    sicknessPregnancy: number; // zasiłek chorobowy w ciąży (kod B)
    rehabPregnancy?: number; // świadczenie rehabilitacyjne – niezdolność w ciąży
  };
  rehabMaxDays?: number;
  oneApplicationDeadlineDays: number;
  socialContributionEmployeeRate: number; // 13,71% – potrącenie z podstawy
  maternityWeeksByChildren: number[]; // indeks = liczba dzieci - 1 (5+ → ostatni)
  parentalWeeks: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number };
  parentalNonTransferableWeeks: number;
  parentalMaxParts: number;
  parentalMaxChildAgeYears: number; // do końca roku kalendarzowego, w którym dziecko kończy X lat
  motherObligatoryWeeks: number;
  prenatalMaxWeeks: number;
  paternityDays: number;
  paternityMaxChildAgeMonths: number;
  stillbirthWeeks: number;
  minDaysAfterChildDeath: number;
  supplementary: {
    // uzupełniający urlop macierzyński
    extremePrematureMaxWeeks: number; // < 28 tc. lub masa ≤ 1000 g
    prematureMaxWeeks: number; // 28–36 tc. i masa > 1000 g
    termHospitalMaxWeeks: number; // ≥ 37 tc. – hospitalizacja
    termMinHospitalDays: number;
    verify: boolean;
  };
  adoption: { maxAgeAdoption: number; maxAgeFoster: number; maxAgeFosterDeferred: number };
  waitingPeriodDays: { mandatory: number; voluntary: number };
  sicknessPeriodDays: number;
  employerPaidDays: { under50: number; over50: number };
  minBenefitMonthly: number; // zasiłek macierzyński nie niższy niż świadczenie rodzicielskie
  voluntaryBaseCapMonthly: number; // 250% prognozowanego przeciętnego wynagrodzenia
  minimumWage: number;
}

export const DEFAULT_PARAMS: Params = {
  version: "2026.11",
  updatedAt: "2026-11-21",
  rates: { maternity: 1, parental: 0.7, oneApplication: 0.815, sicknessPregnancy: 1, rehabPregnancy: 1 },
  rehabMaxDays: 365,
  oneApplicationDeadlineDays: 21,
  socialContributionEmployeeRate: 0.1371,
  maternityWeeksByChildren: [20, 31, 33, 35, 37],
  parentalWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
  parentalNonTransferableWeeks: 9,
  parentalMaxParts: 5,
  parentalMaxChildAgeYears: 6,
  motherObligatoryWeeks: 14,
  prenatalMaxWeeks: 6,
  paternityDays: 14,
  paternityMaxChildAgeMonths: 12,
  stillbirthWeeks: 8,
  minDaysAfterChildDeath: 7,
  supplementary: {
    extremePrematureMaxWeeks: 15,
    prematureMaxWeeks: 8,
    termHospitalMaxWeeks: 3,
    termMinHospitalDays: 5,
    verify: true,
  },
  adoption: { maxAgeAdoption: 14, maxAgeFoster: 7, maxAgeFosterDeferred: 10 },
  waitingPeriodDays: { mandatory: 30, voluntary: 90 },
  sicknessPeriodDays: 270,
  employerPaidDays: { under50: 33, over50: 14 },
  minBenefitMonthly: 1000,
  voluntaryBaseCapMonthly: 23550,
  minimumWage: 4806,
};

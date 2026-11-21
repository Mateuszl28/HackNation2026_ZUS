import type { CalcInput } from "./calculator.ts";

// Syntetyczne sprawy demonstracyjne (NIE są to dokumenty udostępnione przez ZUS – te wolno używać tylko lokalnie,
// wgrywając je przez funkcję uploadu).
export interface DemoCase {
  id: string;
  title: string;
  description: string;
  expected: string;
  input: CalcInput;
  zusData: {
    insurance: { title: string; from: string; to?: string; sickness: "obowiązkowe" | "dobrowolne" | "brak"; base: number }[];
    debt: number;
    ezla: { from: string; to: string; code: string; doctor: string }[];
  };
}

const emptyFather = { title: "none" as const, monthlyBase: 0 };

export const DEMO_CASES: DemoCase[] = [
  {
    id: "anna-etat",
    title: "Anna – umowa o pracę, duży pracodawca",
    description: "Etat od 2021 r., 8 500 zł brutto. Jedno dziecko, plan: 81,5% i podział z partnerem (9 tyg.).",
    expected: "Prawo do zasiłku – wypłaca pracodawca.",
    input: {
      scenario: "birth",
      eventDate: "2027-03-15",
      children: 1,
      mother: { title: "employment", monthlyBase: 8500, insuredSince: "2021-02-01", largeEmployer: true },
      father: { title: "employment", monthlyBase: 9200, insuredSince: "2019-06-01", largeEmployer: false },
      plan: { prenatalWeeks: 2, oneApplication: true, motherParentalWeeks: 32, fatherParentalWeeks: 9, paternity: true },
    },
    zusData: {
      insurance: [{ title: "Umowa o pracę – ABC Logistics S.A.", from: "2021-02-01", sickness: "obowiązkowe", base: 8500 }],
      debt: 0,
      ezla: [{ from: "2026-11-02", to: "2026-11-20", code: "B", doctor: "lek. ginekolog" }],
    },
  },
  {
    id: "kasia-jdg",
    title: "Katarzyna – działalność gospodarcza z zadłużeniem",
    description: "JDG, dobrowolne chorobowe, podstawa 5 652 zł. Zaległa składka 1 240 zł.",
    expected: "Prawo do zasiłku, wypłata po spłacie zadłużenia.",
    input: {
      scenario: "birth",
      eventDate: "2027-01-20",
      children: 1,
      mother: { title: "business", monthlyBase: 5652, insuredSince: "2024-01-01", contributionDebt: 1240 },
      father: { title: "employment", monthlyBase: 7000, insuredSince: "2018-01-01" },
      plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9, paternity: true },
    },
    zusData: {
      insurance: [{ title: "Pozarolnicza działalność gospodarcza", from: "2024-01-01", sickness: "dobrowolne", base: 5652 }],
      debt: 1240,
      ezla: [],
    },
  },
  {
    id: "ola-zlecenie-ustanie",
    title: "Aleksandra – zlecenie kończy się przed porodem",
    description: "Umowa zlecenia z dobrowolnym chorobowym do 2026-12-31, poród 2027-02-10.",
    expected: "Brak prawa do zasiłku macierzyńskiego.",
    input: {
      scenario: "birth",
      eventDate: "2027-02-10",
      children: 1,
      mother: { title: "mandate", monthlyBase: 4200, insuredSince: "2025-03-01", insuredUntil: "2026-12-31" },
      father: { title: "employment", monthlyBase: 6800, insuredSince: "2020-01-01" },
      plan: { fatherParentalWeeks: 41, paternity: true },
    },
    zusData: {
      insurance: [{ title: "Umowa zlecenia – XYZ sp. z o.o.", from: "2025-03-01", to: "2026-12-31", sickness: "dobrowolne", base: 4200 }],
      debt: 0,
      ezla: [],
    },
  },
  {
    id: "blizniaki-wczesniaki",
    title: "Marta – bliźnięta, wcześniaki (30 tc.)",
    description: "Etat, bliźnięta urodzone w 30. tygodniu, 40 dni w szpitalu.",
    expected: "31 tyg. macierzyńskiego + 6 tyg. uzupełniającego + 43 tyg. rodzicielskiego.",
    input: {
      scenario: "birth",
      eventDate: "2026-10-05",
      children: 2,
      prematurity: "premature",
      hospitalDays: 40,
      mother: { title: "employment", monthlyBase: 7300, insuredSince: "2016-09-01", largeEmployer: false },
      father: { title: "employment", monthlyBase: 8100, insuredSince: "2015-01-01" },
      plan: { motherParentalWeeks: 34, fatherParentalWeeks: 9, paternity: true },
    },
    zusData: {
      insurance: [{ title: "Umowa o pracę – Sklep Kwiatek s.c. (8 os.)", from: "2016-09-01", sickness: "obowiązkowe", base: 7300 }],
      debt: 0,
      ezla: [{ from: "2026-08-01", to: "2026-10-04", code: "B", doctor: "lek. ginekolog" }],
    },
  },
  {
    id: "adopcja",
    title: "Państwo Nowak – adopcja 4-latka",
    description: "Wniosek o przysposobienie, dziecko 4 lata. Ojciec korzysta z urlopu na warunkach macierzyńskiego.",
    expected: "20 tyg. na warunkach urlopu macierzyńskiego + rodzicielski.",
    input: {
      scenario: "adoption",
      eventDate: "2026-12-01",
      children: 1,
      childAgeYears: 4,
      mother: { title: "none", monthlyBase: 0 },
      father: { title: "employment", monthlyBase: 10500, insuredSince: "2012-01-01", largeEmployer: true },
      plan: { fatherParentalWeeks: 41, paternity: true },
    },
    zusData: { insurance: [], debt: 0, ezla: [] },
  },
  {
    id: "martwe-urodzenie",
    title: "Ewa – urodzenie martwego dziecka",
    description: "Etat, poród martwego dziecka w 32. tygodniu.",
    expected: "8 tyg. zasiłku macierzyńskiego (100%).",
    input: {
      scenario: "birth",
      eventDate: "2026-11-10",
      children: 1,
      stillbirth: true,
      mother: { title: "employment", monthlyBase: 6000, insuredSince: "2019-04-01" },
      father: emptyFather,
      plan: {},
    },
    zusData: {
      insurance: [{ title: "Umowa o pracę – Urząd Gminy", from: "2019-04-01", sickness: "obowiązkowe", base: 6000 }],
      debt: 0,
      ezla: [],
    },
  },
  {
    id: "praca-rodzicielski",
    title: "Joanna – rodzicielski łączony z pracą na 1/2 etatu",
    description: "Po macierzyńskim wraca na pół etatu, łącząc pracę z urlopem rodzicielskim.",
    expected: "Rodzicielski wydłużony 2×, zasiłek 35% podstawy + pensja.",
    input: {
      scenario: "birth",
      eventDate: "2027-05-01",
      children: 1,
      mother: { title: "employment", monthlyBase: 9000, insuredSince: "2017-01-01", largeEmployer: true },
      father: { title: "employment", monthlyBase: 9000, insuredSince: "2017-01-01" },
      plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9, workFraction: { who: "mother", fraction: 0.5 }, paternity: true },
    },
    zusData: {
      insurance: [{ title: "Umowa o pracę – Bank Przykładowy S.A.", from: "2017-01-01", sickness: "obowiązkowe", base: 9000 }],
      debt: 0,
      ezla: [],
    },
  },
];

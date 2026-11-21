import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, computeBase, maternityWeeks, parentalWeeks, supplementaryWeeks, calculatePregnancySickness } from "../src/calculator.ts";
import { DEMO_CASES } from "../src/cases.ts";
import { parseDocumentText } from "../src/parser.ts";

test("podstawa wymiaru – 13,71%", () => {
  assert.equal(computeBase({ title: "employment", monthlyBase: 10000 }), 8629);
});

test("wymiary urlopów", () => {
  assert.equal(maternityWeeks(1), 20);
  assert.equal(maternityWeeks(2), 31);
  assert.equal(maternityWeeks(7), 37);
  assert.equal(parentalWeeks(1, false), 41);
  assert.equal(parentalWeeks(2, false), 43);
  assert.equal(parentalWeeks(1, true), 65);
  assert.equal(supplementaryWeeks("premature", 40), 6);
  assert.equal(supplementaryWeeks("extreme", 200), 15);
  assert.equal(supplementaryWeeks("termHospital", 3), 0);
});

test("standard: 20 tyg. 100% + 32 tyg. 70% + 9 tyg. ojca", () => {
  const r = calculate({
    scenario: "birth", eventDate: "2027-01-01", children: 1,
    mother: { title: "employment", monthlyBase: 10000 },
    father: { title: "employment", monthlyBase: 10000 },
    plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9 },
  });
  const mat = r.periods.find((p) => p.type === "maternity")!;
  assert.equal(mat.days, 140);
  assert.equal(mat.monthlyAmount, 8629);
  const par = r.periods.filter((p) => p.type === "parental");
  assert.equal(par[0].weeks, 32);
  assert.equal(par[0].monthlyAmount, 6040.3);
  assert.equal(par[1].weeks, 9);
});

test("81,5% za cały okres", () => {
  const r = calculate({
    scenario: "birth", eventDate: "2027-01-01", children: 1,
    mother: { title: "employment", monthlyBase: 10000 }, father: { title: "none", monthlyBase: 0 },
    plan: { oneApplication: true },
  });
  assert.ok(r.periods.every((p) => p.rate === 0.815));
  assert.equal(r.limits.parentalWeeks, 41);
  // ojciec nieubezpieczony → matka ma całe 41 tyg.
  assert.equal(r.periods.find((p) => p.type === "parental")!.weeks, 41);
});

test("brak ubezpieczenia w dniu porodu", () => {
  const c = DEMO_CASES.find((c) => c.id === "ola-zlecenie-ustanie")!;
  const r = calculate(c.input);
  assert.equal(r.mother.eligible, false);
  assert.ok(r.father.total > 0);
});

test("martwe urodzenie – 8 tygodni", () => {
  const r = calculate(DEMO_CASES.find((c) => c.id === "martwe-urodzenie")!.input);
  assert.equal(r.periods.length, 1);
  assert.equal(r.periods[0].weeks, 8);
});

test("łączenie z pracą 1/2 etatu wydłuża urlop 2x", () => {
  const r = calculate(DEMO_CASES.find((c) => c.id === "praca-rodzicielski")!.input);
  const p = r.periods.find((p) => p.type === "parental" && p.who === "mother")!;
  assert.equal(p.weeks, 64);
  assert.equal(p.rate, 0.35);
});

test("adopcja – przekroczony wiek", () => {
  const r = calculate({ scenario: "foster", eventDate: "2027-01-01", children: 1, childAgeYears: 8,
    mother: { title: "employment", monthlyBase: 5000 }, father: { title: "none", monthlyBase: 0 }, plan: {} });
  assert.equal(r.periods.length, 0);
});

test("chorobowy w ciąży – okres wyczekiwania 90 dni (JDG)", () => {
  const r = calculatePregnancySickness({ parent: { title: "business", monthlyBase: 5000, insuredSince: "2027-01-01" }, startDate: "2027-02-01", days: 30 });
  assert.equal(r.eligible, false);
});

test("wszystkie sprawy demo liczą się bez błędów", () => {
  for (const c of DEMO_CASES) assert.ok(calculate(c.input));
});

test("parser Z-3", () => {
  const d = parseDocumentText("ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3\nUmowa o pracę od dnia 01.02.2021\nPodlega ubezpieczeniu chorobowemu\nPrzeciętne wynagrodzenie: 7 334,50\nData porodu 15.03.2027");
  assert.equal(d.title, "employment");
  assert.equal(d.monthlyBase, 7334.5);
  assert.equal(d.insured, true);
  assert.equal(d.eventDate, "2027-03-15");
});

import { compareVariants, deadlines, toICS } from "../src/planning.ts";
import { answerQuestion } from "../src/assistant.ts";

test("porównanie wariantów – 4 warianty, ojciec +9 tyg. zwiększa kwotę", () => {
  const c = DEMO_CASES.find((c) => c.id === "anna-etat")!;
  const { variants, recommendation } = compareVariants(c.input);
  assert.equal(variants.length, 4);
  assert.ok(variants[0].result.total > variants[2].result.total);
  assert.ok(recommendation.length > 10);
});

test("terminy + ICS", () => {
  const c = DEMO_CASES.find((c) => c.id === "anna-etat")!;
  const d = deadlines(c.input, calculate(c.input));
  assert.ok(d.some((x) => x.title.includes("81,5")));
  assert.ok(toICS(d).startsWith("BEGIN:VCALENDAR"));
});

test("asystent rozpoznaje intencje", () => {
  assert.equal(answerQuestion("czy opłaca się 81,5%?").intent, "815");
  assert.equal(answerQuestion("co przysługuje tacie").intent, "ojciec");
  assert.equal(answerQuestion("mam JDG i zadłużenie").intent, "dzialalnosc");
});

import { baseFromMonths, last12Months, monthsFromText } from "../src/base.ts";

test("podstawa z 12 miesięcy – uzupełnienie i pominięcie", () => {
  const m = last12Months("2027-03-15", 8000);
  m[0] = { ...m[0], gross: 6000, workedDays: 15, requiredDays: 20 }; // uzupełnienie → 8000
  m[1] = { ...m[1], gross: 2000, workedDays: 5, requiredDays: 20 }; // pominięty
  const r = baseFromMonths(m);
  assert.equal(r.monthsCounted, 11);
  assert.equal(r.average, 8000);
  assert.equal(r.base, 6903.2);
  assert.equal(m[0].month, "2026-03");
});

test("odczyt miesięcy z tekstu Z-3", () => {
  const r = monthsFromText("03.2026 7 250,00 zł 21 / 21\n04.2026 7 300,00\n2026-05 7400.00");
  assert.equal(r.length, 3);
  assert.equal(r[0].gross, 7250);
  assert.equal(r[0].workedDays, 21);
});

import { calculatePregnancyBenefits } from "../src/pregnancy.ts";

test("ciąża: wynagrodzenie → zasiłek → świadczenie rehabilitacyjne, koniec przed porodem", () => {
  const r = calculatePregnancyBenefits({ parent: { title: "employment", monthlyBase: 6000, insuredSince: "2020-01-01" }, dueDate: "2027-12-31", sickFrom: "2027-01-01", sickDays: 400 });
  assert.deepEqual(r.segments.map((s) => [s.kind, s.days]), [["employerSick", 33], ["sickness", 237], ["rehab", 94]]);
  assert.equal(r.segments.at(-1)!.to, "2027-12-30");
});

test("ciąża: likwidacja pracodawcy → zasiłek w wysokości macierzyńskiego do porodu", () => {
  const r = calculatePregnancyBenefits({ parent: { title: "employment", monthlyBase: 6000 }, dueDate: "2027-06-01", jobLoss: { date: "2027-03-31", reason: "liquidation" } });
  assert.equal(r.segments[0].kind, "maternityEquivalent");
  assert.equal(r.segments[0].from, "2027-04-01");
  assert.equal(r.segments[0].to, "2027-05-31");
  const r2 = calculatePregnancyBenefits({ parent: { title: "employment", monthlyBase: 6000 }, dueDate: "2027-06-01", jobLoss: { date: "2027-03-31", reason: "other" } });
  assert.equal(r2.segments.length, 0);
});

test("asystent: utrata pracy i świadczenie rehabilitacyjne", () => {
  assert.equal(answerQuestion("pracodawca ogłosił likwidację, jestem w ciąży").intent, "utrata");
  assert.equal(answerQuestion("co po 270 dniach L4?").intent, "rehab");
});

import { buildChecklist, decodePlan, encodePlan, pregnancyProgress } from "../src/checklist.ts";

test("checklista, postęp ciąży, link do planu", () => {
  const c = DEMO_CASES.find((c) => c.id === "kasia-jdg")!;
  const items = buildChecklist(c.input, calculate(c.input), "2026-11-21");
  assert.ok(items.some((i) => i.id.startsWith("debt-") && i.critical));
  assert.ok(new Set(items.map((i) => i.id)).size === items.length);
  const p = pregnancyProgress("2027-01-20", "2026-11-21");
  assert.equal(p.week, 31);
  assert.equal(p.trimester, 3);
  assert.deepEqual(decodePlan(encodePlan(c.input)), c.input);
});

import { employerView } from "../src/employer.ts";

test("pracodawca: próg 20 ubezpieczonych i koszt wynagrodzenia chorobowego", () => {
  const small = employerView({ insuredCount: 8, monthlyGross: 6000, dueDate: "2027-05-01", sickDays: 60, leave: { motherParentalWeeks: 41 } });
  assert.equal(small.paysBenefits, false);
  assert.equal(small.employerSickDays, 33);
  assert.equal(small.employerSickCost, 5695.14);
  const big = employerView({ insuredCount: 21, monthlyGross: 6000, dueDate: "2027-05-01", leave: {} });
  assert.equal(big.paysBenefits, true);
});

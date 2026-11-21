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

// Testy end-to-end REST API na działającym serwerze: `npm run test:api` (BASE_URL domyślnie http://localhost:3000).
// Sprawdzają kontrakty API, zabezpieczenia panelu urzędnika i pełny obieg wniosek → decyzja → obywatel.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LOGIN = process.env.ADMIN_LOGIN ?? "urzednik";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "zus2026";
let cookie = "";

const api = (path, opts = {}) =>
  fetch(BASE + path, { ...opts, headers: { "content-type": "application/json", ...(opts.auth ? { cookie } : {}), ...(opts.headers ?? {}) }, body: opts.json ? JSON.stringify(opts.json) : opts.body });

test("GET /api/params – parametry publiczne", async () => {
  const r = await api("/api/params");
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.deepEqual(j.params.maternityWeeksByChildren, [20, 31, 33, 35, 37]);
  assert.equal(j.params.rates.oneApplication, 0.815);
});

test("POST /api/calculate – 20 tyg. 100% + 32 tyg. 70% + 9 tyg. ojca", async () => {
  const r = await api("/api/calculate", { method: "POST", json: { scenario: "birth", eventDate: "2027-01-01", children: 1, mother: { title: "employment", monthlyBase: 10000 }, father: { title: "employment", monthlyBase: 10000 }, plan: { motherParentalWeeks: 32, fatherParentalWeeks: 9 } } });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.periods[0].monthlyAmount, 8629);
  assert.equal(j.periods.filter((p) => p.type === "parental").length, 2);
});

test("POST /api/calculate – walidacja", async () => {
  assert.equal((await api("/api/calculate", { method: "POST", json: {} })).status, 400);
});

test("POST /api/parse – odczyt Z-3 i podstawa z miesięcy", async () => {
  const text = "Z-3 Umowa o pracę od dnia 01.02.2021 Podlega ubezpieczeniu chorobowemu\n03.2026 7 250,00 21 21\n04.2026 7 250,00 21 21\n05.2026 3 000,00 8 20\n06.2026 7 400,00 22 22";
  const j = await (await api("/api/parse", { method: "POST", json: { text } })).json();
  assert.equal(j.title, "employment");
  assert.equal(j.insured, true);
  assert.equal(j.computedBase, 6299.17);
});

test("POST /api/assistant – rozpoznanie intencji", async () => {
  const j = await (await api("/api/assistant", { method: "POST", json: { question: "Czy opłaca się 81,5%?" } })).json();
  assert.equal(j.intent, "815");
});

test("Panel urzędnika – bez sesji brak dostępu", async () => {
  assert.equal((await api("/api/stats")).status, 401);
  assert.equal((await api("/api/admin/cases")).status, 401);
  assert.equal((await api("/api/params", { method: "PUT", json: { reset: true } })).status, 401);
  const r = await fetch(BASE + "/admin", { redirect: "manual" });
  assert.ok([307, 308].includes(r.status));
});

test("Logowanie urzędnika – złe i dobre hasło", async () => {
  assert.equal((await api("/api/admin/session", { method: "POST", json: { login: LOGIN, password: "zle" } })).status, 401);
  const r = await api("/api/admin/session", { method: "POST", json: { login: LOGIN, password: PASSWORD } });
  assert.equal(r.status, 200);
  cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
  assert.match(cookie, /^zpr_admin=/);
});

test("Podrobione ciasteczko jest odrzucane", async () => {
  const forged = cookie.slice(0, -1) + (cookie.endsWith("0") ? "1" : "0");
  assert.equal((await fetch(BASE + "/api/stats", { headers: { cookie: forged } })).status, 401);
});

test("Obieg: wniosek obywatela → wezwanie → dokument → decyzja widoczna u obywatela", async () => {
  const caseId = "natalia-dzielo";
  const appId = `TEST-${Date.now()}`;
  assert.equal((await api("/api/applications", { method: "POST", json: { caseId, id: appId, title: "ZAM – test", to: "ZUS (eZUS)" } })).status, 200);

  const list = await (await api("/api/admin/cases", { auth: true })).json();
  const row = list.find((x) => x.id === caseId);
  assert.ok(row.applications >= 1);
  assert.equal(row.recommendation, "refuse");

  const req = await (await api(`/api/admin/cases/${caseId}/decision`, { method: "POST", auth: true, json: { type: "request", justification: "Test wezwania – brak dokumentów.", legalBasis: ["test"], missingDocs: ["Dokument testowy"] } })).json();
  assert.equal(req.type, "request");

  assert.equal((await api("/api/applications/documents", { method: "POST", json: { caseId, name: "Dokument testowy", inResponseTo: req.id } })).status, 200);
  const after = (await (await api("/api/admin/cases", { auth: true })).json()).find((x) => x.id === caseId);
  assert.equal(after.docsAfterDecision, true);

  const dec = await (await api(`/api/admin/cases/${caseId}/decision`, { method: "POST", auth: true, json: { type: "refuse", justification: "Brak tytułu do ubezpieczenia chorobowego.", legalBasis: ["art. 29"] } })).json();
  const mine = await (await api(`/api/applications?caseId=${caseId}`)).json();
  assert.equal(mine.decisions[0].id, dec.id);
  assert.equal("notes" in mine, false, "notatki urzędnika nie mogą trafiać do obywatela");
});

test("Eksport CSV wymaga sesji i zwraca CSV", async () => {
  assert.equal((await api("/api/admin/export?type=cases")).status, 401);
  const r = await api("/api/admin/export?type=cases", { auth: true });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type") ?? "", /text\/csv/);
});

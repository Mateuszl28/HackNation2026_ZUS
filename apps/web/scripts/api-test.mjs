// Testy end-to-end REST API na działającym serwerze: `npm run test:api` (BASE_URL domyślnie http://localhost:3000).
// Sprawdzają kontrakty API, zabezpieczenia panelu urzędnika i pełny obieg wniosek → decyzja → obywatel.
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LOGIN = process.env.ADMIN_LOGIN ?? "urzednik";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "zus2026";
let cookie = "";
let managerCookie = "";

const api = (path, opts = {}) =>
  fetch(BASE + path, { ...opts, headers: { "content-type": "application/json", ...(opts.auth ? { cookie: opts.auth === "manager" ? managerCookie : cookie } : {}), ...(opts.headers ?? {}) }, body: opts.json ? JSON.stringify(opts.json) : opts.body });

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
  const m = await api("/api/admin/session", { method: "POST", json: { login: process.env.MANAGER_LOGIN ?? "kierownik", password: process.env.MANAGER_PASSWORD ?? "zus2026k" } });
  assert.equal(m.status, 200);
  assert.equal((await m.json()).role, "manager");
  managerCookie = (m.headers.get("set-cookie") ?? "").split(";")[0];
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
  assert.equal(dec.status, "pending_approval");
  await api(`/api/admin/cases/${caseId}/approve`, { method: "POST", auth: "manager", json: { decisionId: dec.id, action: "approve" } });
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

test("Odwołanie: odmowa → odwołanie obywatela → uwzględnienie przez ZUS (samokontrola)", async () => {
  const caseId = "natalia-dzielo";
  const dec = await (await api(`/api/admin/cases/${caseId}/decision`, { method: "POST", auth: true, json: { type: "refuse", justification: "Brak tytułu do ubezpieczenia chorobowego.", legalBasis: ["art. 29"] } })).json();
  await api(`/api/admin/cases/${caseId}/approve`, { method: "POST", auth: "manager", json: { decisionId: dec.id, action: "approve" } });
  assert.equal((await api("/api/applications/appeal", { method: "POST", json: { caseId, decisionId: dec.id, text: "za krótko" } })).status, 400);
  const ap = await (await api("/api/applications/appeal", { method: "POST", json: { caseId, decisionId: dec.id, text: "W dniu porodu miałam umowę zlecenia z dobrowolnym chorobowym – załączam umowę." } })).json();
  assert.equal(ap.status, "pending");
  assert.equal((await api("/api/applications/appeal", { method: "POST", json: { caseId, decisionId: dec.id, text: "Drugie odwołanie od tej samej decyzji – powinno być odrzucone." } })).status, 409);
  const row = (await (await api("/api/admin/cases", { auth: true })).json()).find((x) => x.id === caseId);
  assert.equal(row.pendingAppeal, true);
  assert.equal((await api(`/api/admin/cases/${caseId}/appeal`, { method: "POST", json: { appealId: ap.id, action: "accept", resolution: "Uwzględniono – samokontrola." } })).status, 401);
  const res = await (await api(`/api/admin/cases/${caseId}/appeal`, { method: "POST", auth: true, json: { appealId: ap.id, action: "accept", resolution: "Uwzględniono – samokontrola." } })).json();
  assert.equal(res.status, "accepted");
  const mine = await (await api(`/api/applications?caseId=${caseId}`)).json();
  assert.equal(mine.appeals[0].status, "accepted");
});

test("Zasada dwóch par oczu: odmowa urzędnika niewidoczna dla obywatela do zatwierdzenia przez kierownika", async () => {
  const caseId = "natalia-dzielo";
  const dec = await (await api(`/api/admin/cases/${caseId}/decision`, { method: "POST", auth: true, json: { type: "refuse", justification: "Test zasady dwóch par oczu – odmowa.", legalBasis: ["art. 29"] } })).json();
  assert.equal(dec.status, "pending_approval");
  let mine = await (await api(`/api/applications?caseId=${caseId}`)).json();
  assert.ok(!mine.decisions.some((x) => x.id === dec.id), "obywatel nie może widzieć niezatwierdzonej odmowy");
  assert.equal((await api(`/api/admin/cases/${caseId}/approve`, { method: "POST", auth: true, json: { decisionId: dec.id, action: "approve" } })).status, 403, "urzędnik nie może sam zatwierdzić");
  assert.equal((await api(`/api/admin/cases/${caseId}/approve`, { method: "POST", auth: "manager", json: { decisionId: dec.id, action: "return" } })).status, 400, "zwrot wymaga komentarza");
  const ret = await (await api(`/api/admin/cases/${caseId}/approve`, { method: "POST", auth: "manager", json: { decisionId: dec.id, action: "return", comment: "Uzupełnij uzasadnienie o datę ustania umowy." } })).json();
  assert.equal(ret.status, "returned");
  mine = await (await api(`/api/applications?caseId=${caseId}`)).json();
  assert.ok(!mine.decisions.some((x) => x.id === dec.id), "zwrócona decyzja nie trafia do obywatela");
  const byManager = await (await api(`/api/admin/cases/${caseId}/decision`, { method: "POST", auth: "manager", json: { type: "refuse", justification: "Odmowa wydana przez kierownika.", legalBasis: ["art. 29"] } })).json();
  assert.equal(byManager.status, "published");
});

test("Analiza zestawu dokumentów: ubezpieczenie, podstawa i zgodność z decyzją ZUS", async () => {
  const fd = new FormData();
  fd.append("files", new Blob(["ZAŚWIADCZENIE PŁATNIKA SKŁADEK Z-3\nUmowa o pracę. Podlega ubezpieczeniu chorobowemu\n01.2026 7 000,00 21 21\n02.2026 7 000,00 20 20\n03.2026 7 200,00 22 22"], { type: "text/plain" }), "z3.txt");
  fd.append("files", new Blob(["ZAM Data porodu: 12.05.2026"], { type: "text/plain" }), "zam.txt");
  fd.append("files", new Blob(["Ubezpieczenie chorobowe od 01.02.2021 do nadal. Status: przyznano zasiłek macierzyński"], { type: "text/plain" }), "system.txt");
  const j = await (await fetch(BASE + "/api/dossier", { method: "POST", body: fd })).json();
  assert.equal(j.insuredOnEvent, true);
  assert.equal(j.verdict, "granted");
  assert.equal(j.agreement, true);
  assert.ok(j.result.total > 0);
});

import { calculate, DECISION_LABELS, DEMO_CASES, recommendDecision } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { allCases } from "@/lib/cases-store";
import { getStats } from "@/lib/analytics";
import { getConfig } from "@/lib/params-store";

const csv = (rows: (string | number)[][]) =>
  "﻿" + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n"); // BOM + średnik – Excel PL

/** GET ?type=cases|stats – eksport CSV dla urzędnika (raportowanie). */
export async function GET(req: Request) {
  if (!(await adminFromRequest(req))) return unauthorized();
  const type = new URL(req.url).searchParams.get("type") ?? "cases";
  const date = new Date().toISOString().slice(0, 10);
  let body: string;
  if (type === "stats") {
    const s = await getStats();
    const rows: (string | number)[][] = [["kategoria", "klucz", "liczba"], ["ogółem", "zapisane plany", s.plans], ["ogółem", "pytania do asystenta", s.questions]];
    for (const [group, data] of [["temat pytania", s.intents], ["ryzyko", s.risks], ["sytuacja", s.scenarios], ["forma zatrudnienia", s.titles]] as const)
      for (const [k, v] of Object.entries(data)) rows.push([group, k, v]);
    body = csv(rows);
  } else {
    const { params } = await getConfig();
    const store = await allCases();
    const rows: (string | number)[][] = [["sprawa", "osoba", "sytuacja", "data zdarzenia", "ubezpieczenie", "rekomendacja", "wnioski", "dokumenty", "ostatnia decyzja", "data decyzji", "urzędnik", "kwota łączna"]];
    for (const c of DEMO_CASES) {
      const r = calculate(c.input, params);
      const d = store.decisions.find((x) => x.caseId === c.id);
      rows.push([c.id, c.title.split(" – ")[0], c.input.scenario, c.input.eventDate, r.mother.eligible || r.father.eligible ? "tak" : "nie", DECISION_LABELS[recommendDecision(c.input, r, c.zusData).type], store.applications.filter((a) => a.caseId === c.id).length, (store.documents ?? []).filter((x) => x.caseId === c.id).length, d ? DECISION_LABELS[d.type] : "", d ? d.at.slice(0, 10) : "", d?.by ?? "", r.total.toFixed(2).replace(".", ",")]);
    }
    body = csv(rows);
  }
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="przewodnik-${type}-${date}.csv"` } });
}

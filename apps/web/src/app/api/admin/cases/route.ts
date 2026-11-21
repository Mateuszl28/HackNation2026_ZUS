import { calculate, DEMO_CASES, recommendDecision } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { allCases } from "@/lib/cases-store";
import { getConfig } from "@/lib/params-store";
import { sla } from "@/lib/case-checks";

/** GET – lista spraw (osób) z rekomendacją systemu i statusem. Tylko urzędnik. */
export async function GET(req: Request) {
  if (!(await adminFromRequest(req))) return unauthorized();
  const { params } = await getConfig();
  const store = await allCases();
  return Response.json(
    DEMO_CASES.map((c) => {
      const result = calculate(c.input, params);
      const rec = recommendDecision(c.input, result, c.zusData);
      const apps = store.applications.filter((a) => a.caseId === c.id);
      const docs = (store.documents ?? []).filter((d) => d.caseId === c.id);
      const last = store.decisions.find((d) => d.caseId === c.id);
      const lastDocAt = docs[0]?.at ?? null;
      const pendingAppeal = (store.appeals ?? []).some((a) => a.caseId === c.id && a.status === "pending");
      return {
        id: c.id,
        name: c.title.split(" – ")[0],
        title: c.title,
        scenario: c.input.scenario,
        eventDate: c.input.eventDate,
        insured: result.mother.eligible || result.father.eligible,
        total: result.total,
        recommendation: rec.type,
        manualChecks: rec.manualChecks.length,
        applications: apps.length,
        lastApplicationAt: Math.max(apps[0]?.sentAt ?? 0, lastDocAt ?? 0) || null,
        documents: docs.length,
        pendingAppeal,
        docsAfterDecision: !!(last && lastDocAt && lastDocAt > new Date(last.at).getTime()),
        sla: sla(
          [...apps.map((a) => a.sentAt), ...docs.map((d) => d.at)].filter((t) => !last || t > new Date(last.at).getTime()).sort((a, b) => a - b)[0] ?? null,
        ),
        decision: last ? { type: last.type, at: last.at, by: last.by } : null,
      };
    }),
  );
}

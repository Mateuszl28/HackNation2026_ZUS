import { calculate, DEMO_CASES, recommendDecision } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { forCase, notesFor } from "@/lib/cases-store";
import { getConfig } from "@/lib/params-store";
import { crossCheck, sla } from "@/lib/case-checks";

/** GET – pełna karta sprawy dla urzędnika. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminFromRequest(req))) return unauthorized();
  const { id } = await params;
  const c = DEMO_CASES.find((x) => x.id === id);
  if (!c) return Response.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  const { params: p } = await getConfig();
  const result = calculate(c.input, p);
  const data = await forCase(id);
  const last = data.decisions[0];
  const pending = [...data.applications.map((a) => a.sentAt), ...data.documents.map((d) => d.at)].filter((t) => !last || t > new Date(last.at).getTime()).sort((a, b) => a - b)[0] ?? null;
  return Response.json({ case: c, result, recommendation: recommendDecision(c.input, result, c.zusData), ...data, notes: await notesFor(id), checks: crossCheck(c, data.documents), sla: sla(pending) });
}

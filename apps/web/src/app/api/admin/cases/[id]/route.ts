import { calculate, DEMO_CASES, recommendDecision } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { forCase } from "@/lib/cases-store";
import { getConfig } from "@/lib/params-store";

/** GET – pełna karta sprawy dla urzędnika. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminFromRequest(req))) return unauthorized();
  const { id } = await params;
  const c = DEMO_CASES.find((x) => x.id === id);
  if (!c) return Response.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  const { params: p } = await getConfig();
  const result = calculate(c.input, p);
  return Response.json({ case: c, result, recommendation: recommendDecision(c.input, result, c.zusData), ...(await forCase(id)) });
}

import { calculate, DEMO_CASES, type DecisionType } from "@zus/engine";
import { sessionFromRequest, unauthorized } from "@/lib/admin-auth";
import { addDecision } from "@/lib/cases-store";
import { getConfig } from "@/lib/params-store";

const TYPES: DecisionType[] = ["grant", "refuse", "request"];

/** POST { type, justification, legalBasis[], missingDocs[] } – wydanie decyzji w sprawie (tylko urzędnik). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(req);
  if (!session) return unauthorized();
  const official = session.login;
  const { id } = await params;
  const c = DEMO_CASES.find((x) => x.id === id);
  if (!c) return Response.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  const b = await req.json().catch(() => null);
  if (!b || !TYPES.includes(b.type) || typeof b.justification !== "string" || b.justification.trim().length < 10)
    return Response.json({ error: "Wybierz rodzaj rozstrzygnięcia i wpisz uzasadnienie (min. 10 znaków)." }, { status: 400 });
  const { params: p } = await getConfig();
  const r = calculate(c.input, p);
  const benefit = b.type === "grant" ? r.periods.map((x) => ({ who: x.who === "mother" ? "matka" : "ojciec", label: x.label, from: x.start, to: x.end, monthly: x.monthlyAmount, total: x.total })) : undefined;
  const d = await addDecision({
    id: `DEC/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`,
    caseId: id,
    type: b.type,
    by: official,
    at: new Date().toISOString(),
    justification: b.justification.trim().slice(0, 4000),
    legalBasis: (Array.isArray(b.legalBasis) ? b.legalBasis : []).map(String).slice(0, 10),
    missingDocs: b.type === "request" ? (Array.isArray(b.missingDocs) ? b.missingDocs : []).map(String).slice(0, 20) : undefined,
    benefit,
    total: b.type === "grant" ? r.total : undefined,
    // zasada dwóch par oczu: odmowa wydana przez urzędnika wymaga zatwierdzenia kierownika
    status: b.type === "refuse" && session.role !== "manager" ? "pending_approval" : "published",
    approvedBy: b.type === "refuse" && session.role === "manager" ? official : undefined,
  });
  return Response.json(d);
}

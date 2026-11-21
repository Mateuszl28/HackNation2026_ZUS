import { DEMO_CASES } from "@zus/engine";
import { addApplication, forCase } from "@/lib/cases-store";

const known = (id: unknown) => typeof id === "string" && DEMO_CASES.some((c) => c.id === id);

/**
 * Obywatel (symulowane konto mObywatel = sprawa demo):
 * POST { caseId, id, title, to } – rejestracja wniosku złożonego do ZUS,
 * GET ?caseId= – wnioski i decyzje w sprawie (widok „Moje decyzje”).
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !known(b.caseId) || typeof b.id !== "string" || typeof b.title !== "string") return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  return Response.json(await addApplication({ id: b.id.slice(0, 40), caseId: b.caseId, title: b.title.slice(0, 200), to: String(b.to ?? "ZUS").slice(0, 80), sentAt: Date.now() }));
}

export async function GET(req: Request) {
  const caseId = new URL(req.url).searchParams.get("caseId");
  if (!known(caseId)) return Response.json({ error: "Nieznana sprawa" }, { status: 404 });
  return Response.json(await forCase(caseId!));
}

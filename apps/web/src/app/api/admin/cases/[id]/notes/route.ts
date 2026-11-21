import { DEMO_CASES } from "@zus/engine";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { addNote } from "@/lib/cases-store";

/** POST { text } – notatka wewnętrzna urzędnika w sprawie (niewidoczna dla obywatela). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const official = await adminFromRequest(req);
  if (!official) return unauthorized();
  const { id } = await params;
  if (!DEMO_CASES.some((c) => c.id === id)) return Response.json({ error: "Nie znaleziono sprawy" }, { status: 404 });
  const b = await req.json().catch(() => null);
  const text = typeof b?.text === "string" ? b.text.trim() : "";
  if (text.length < 2) return Response.json({ error: "Pusta notatka" }, { status: 400 });
  return Response.json(await addNote({ id: `N-${Date.now().toString(36)}`, caseId: id, by: official, at: new Date().toISOString(), text: text.slice(0, 2000) }));
}

import { forbidden, sessionFromRequest, unauthorized } from "@/lib/admin-auth";
import { reviewDecision } from "@/lib/cases-store";

/** POST { decisionId, action: "approve" | "return", comment } – kierownik zatwierdza odmowę lub zwraca ją do poprawy. */
export async function POST(req: Request) {
  const s = await sessionFromRequest(req);
  if (!s) return unauthorized();
  if (s.role !== "manager") return forbidden();
  const b = await req.json().catch(() => null);
  if (!b || !["approve", "return"].includes(b.action)) return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  if (b.action === "return" && (typeof b.comment !== "string" || b.comment.trim().length < 5)) return Response.json({ error: "Przy zwrocie wpisz komentarz dla urzędnika." }, { status: 400 });
  const d = await reviewDecision(String(b.decisionId), { status: b.action === "approve" ? "published" : "returned", approvedBy: s.login, approvalComment: typeof b.comment === "string" ? b.comment.trim().slice(0, 2000) : undefined });
  if (!d) return Response.json({ error: "Decyzja nie oczekuje na zatwierdzenie" }, { status: 404 });
  return Response.json(d);
}

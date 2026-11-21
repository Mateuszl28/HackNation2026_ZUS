import { adminFromRequest, unauthorized } from "@/lib/admin-auth";
import { resolveAppeal } from "@/lib/cases-store";

/**
 * POST { appealId, action: "accept" | "forward", resolution } – rozpatrzenie odwołania przez ZUS (art. 477⁹ KPC):
 * accept – uwzględnienie (samokontrola; urzędnik wydaje następnie nową decyzję), forward – przekazanie do sądu ze stanowiskiem.
 */
export async function POST(req: Request) {
  const official = await adminFromRequest(req);
  if (!official) return unauthorized();
  const b = await req.json().catch(() => null);
  if (!b || !["accept", "forward"].includes(b.action) || typeof b.resolution !== "string" || b.resolution.trim().length < 10)
    return Response.json({ error: "Wybierz sposób rozpatrzenia i wpisz uzasadnienie (min. 10 znaków)." }, { status: 400 });
  const a = await resolveAppeal(String(b.appealId), { status: b.action === "accept" ? "accepted" : "forwarded", resolvedBy: official, resolution: b.resolution.trim().slice(0, 4000) });
  if (!a) return Response.json({ error: "Nie znaleziono odwołania lub zostało już rozpatrzone" }, { status: 404 });
  return Response.json(a);
}

import { getStats, resetStats } from "@/lib/analytics";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "admin";

/** GET /api/stats – anonimowe statystyki (panel admina). DELETE – wyzerowanie. */
export async function GET(req: Request) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) return Response.json({ error: "Brak uprawnień" }, { status: 401 });
  return Response.json(await getStats());
}
export async function DELETE(req: Request) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) return Response.json({ error: "Brak uprawnień" }, { status: 401 });
  return Response.json(await resetStats());
}

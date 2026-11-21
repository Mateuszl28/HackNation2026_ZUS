import { getStats, resetStats } from "@/lib/analytics";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";

/** GET – anonimowe statystyki; DELETE – wyzerowanie. Tylko urzędnik. */
export async function GET(req: Request) {
  if (!(await adminFromRequest(req))) return unauthorized();
  return Response.json(await getStats());
}
export async function DELETE(req: Request) {
  if (!(await adminFromRequest(req))) return unauthorized();
  return Response.json(await resetStats());
}

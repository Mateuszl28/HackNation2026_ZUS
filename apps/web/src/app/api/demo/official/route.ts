import { issueToken, loginForRole, sessionCookie, type Role } from "@/lib/admin-auth";

/** POST ?role=official|manager – szybkie logowanie dla jury (tylko tryb demo; DEMO_MODE=off → 403). */
export async function POST(req: Request) {
  if ((process.env.DEMO_MODE ?? "on") === "off") return Response.json({ error: "Tryb demo wyłączony" }, { status: 403 });
  const role: Role = new URL(req.url).searchParams.get("role") === "manager" ? "manager" : "official";
  const login = loginForRole(role);
  const { value, maxAge } = await issueToken(login, role);
  return new Response(JSON.stringify({ ok: true, login, role }), { headers: { "content-type": "application/json", "set-cookie": sessionCookie(value, maxAge) } });
}

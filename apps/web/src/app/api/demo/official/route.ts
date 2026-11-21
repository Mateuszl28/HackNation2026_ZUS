import { ADMIN_COOKIE, issueToken } from "@/lib/admin-auth";

/** POST – szybkie logowanie urzędnika dla jury (tylko tryb demo; w produkcji DEMO_MODE=off → 403). */
export async function POST() {
  if ((process.env.DEMO_MODE ?? "on") === "off") return Response.json({ error: "Tryb demo wyłączony" }, { status: 403 });
  const login = process.env.ADMIN_LOGIN ?? "urzednik";
  const { value, maxAge } = await issueToken(login);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true, login }), { headers: { "content-type": "application/json", "set-cookie": `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}` } });
}

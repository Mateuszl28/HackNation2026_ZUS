import { ADMIN_COOKIE, adminFromRequest, checkCredentials, issueToken } from "@/lib/admin-auth";

/** GET – status sesji urzędnika; POST { login, password } – logowanie; DELETE – wylogowanie. */
export async function GET(req: Request) {
  const login = await adminFromRequest(req);
  return Response.json({ authenticated: !!login, login });
}

export async function POST(req: Request) {
  const { login, password } = await req.json().catch(() => ({}));
  if (!checkCredentials(login, password)) {
    await new Promise((r) => setTimeout(r, 600)); // spowolnienie prób zgadywania
    return Response.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 });
  }
  const { value, maxAge } = await issueToken(login);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ authenticated: true, login }), {
    headers: { "content-type": "application/json", "set-cookie": `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}` },
  });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: { "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
}

import { blockedFor, clientKey, registerFailure, registerSuccess } from "@/lib/rate-limit";
import { checkCredentials, issueToken, ROLE_LABELS, sessionCookie, sessionFromRequest, ADMIN_COOKIE } from "@/lib/admin-auth";

/** GET – status sesji; POST { login, password } – logowanie; DELETE – wylogowanie. */
export async function GET(req: Request) {
  const s = await sessionFromRequest(req);
  return Response.json({ authenticated: !!s, login: s?.login ?? null, role: s?.role ?? null, roleLabel: s ? ROLE_LABELS[s.role] : null });
}

export async function POST(req: Request) {
  const key = clientKey(req);
  const wait = blockedFor(key);
  if (wait) return Response.json({ error: `Zbyt wiele nieudanych prób. Spróbuj ponownie za ${Math.ceil(wait / 60)} min.` }, { status: 429, headers: { "retry-after": String(wait) } });
  const { login, password } = await req.json().catch(() => ({}));
  const role = checkCredentials(login, password);
  if (!role) {
    registerFailure(key);
    await new Promise((r) => setTimeout(r, 600)); // spowolnienie prób zgadywania
    return Response.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 });
  }
  registerSuccess(key);
  const { value, maxAge } = await issueToken(login, role);
  return new Response(JSON.stringify({ authenticated: true, login, role }), { headers: { "content-type": "application/json", "set-cookie": sessionCookie(value, maxAge) } });
}

export async function DELETE() {
  return new Response(null, { status: 204, headers: { "set-cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
}

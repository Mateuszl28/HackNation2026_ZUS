// Uwierzytelnianie pracowników ZUS (panel urzędnika). Podpisane ciasteczko httpOnly (HMAC-SHA256, Web Crypto).
// Role: "official" (urzędnik) i "manager" (kierownik – zatwierdza decyzje odmowne, zasada dwóch par oczu).
// Dane logowania i sekret z env; wartości domyślne wyłącznie na potrzeby demo.
export const ADMIN_COOKIE = "zpr_admin";
export type Role = "official" | "manager";
export const ROLE_LABELS: Record<Role, string> = { official: "urzędnik", manager: "kierownik" };

const USERS: { login: string; password: string; role: Role }[] = [
  { login: process.env.ADMIN_LOGIN ?? "urzednik", password: process.env.ADMIN_PASSWORD ?? "zus2026", role: "official" },
  { login: process.env.MANAGER_LOGIN ?? "kierownik", password: process.env.MANAGER_PASSWORD ?? "zus2026k", role: "manager" },
];
const SECRET = process.env.ADMIN_SECRET ?? "dev-secret-zmien-w-produkcji";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 h

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Zwraca rolę przy poprawnych danych, inaczej null (porównanie w stałym czasie dla każdego konta). */
export function checkCredentials(login: string, password: string): Role | null {
  let role: Role | null = null;
  for (const u of USERS) if (safeEqual(login ?? "", u.login) && safeEqual(password ?? "", u.password)) role = u.role;
  return role;
}

export const loginForRole = (role: Role) => USERS.find((u) => u.role === role)!.login;

/** Token: login~rola.wygaśnięcie.podpis */
export async function issueToken(login: string, role: Role = "official") {
  const exp = Date.now() + TTL_MS;
  const payload = `${login}~${role}.${exp}`;
  return { value: `${payload}.${await hmac(payload)}`, maxAge: TTL_MS / 1000 };
}

export async function verifySession(token: string | undefined | null): Promise<{ login: string; role: Role } | null> {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, await hmac(payload))) return null;
  const [who, exp] = payload.split(".");
  if (!(Number(exp) > Date.now())) return null;
  const [login, role] = who.split("~");
  return { login, role: role === "manager" ? "manager" : "official" };
}

/** Zgodność wsteczna: zwraca sam login. */
export async function verifyToken(token: string | undefined | null) {
  return (await verifySession(token))?.login ?? null;
}

function cookieFrom(req: Request) {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** Login zalogowanego pracownika (dowolna rola) albo null. */
export async function adminFromRequest(req: Request) {
  return verifyToken(cookieFrom(req));
}

export async function sessionFromRequest(req: Request) {
  return verifySession(cookieFrom(req));
}

export const sessionCookie = (value: string, maxAge: number) =>
  `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const unauthorized = () => Response.json({ error: "Wymagane logowanie urzędnika" }, { status: 401 });
export const forbidden = () => Response.json({ error: "Wymagane uprawnienia kierownika" }, { status: 403 });

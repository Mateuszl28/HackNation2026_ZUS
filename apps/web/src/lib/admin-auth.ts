// Uwierzytelnianie urzędnika (panel administracyjny). Podpisane ciasteczko httpOnly (HMAC-SHA256, Web Crypto).
// Dane logowania i sekret z env; wartości domyślne wyłącznie na potrzeby demo.
export const ADMIN_COOKIE = "zpr_admin";
const LOGIN = process.env.ADMIN_LOGIN ?? "urzednik";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "zus2026";
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

export function checkCredentials(login: string, password: string) {
  return safeEqual(login ?? "", LOGIN) && safeEqual(password ?? "", PASSWORD);
}

/** Token: login.expiry.signature */
export async function issueToken(login: string) {
  const exp = Date.now() + TTL_MS;
  const payload = `${login}.${exp}`;
  return { value: `${payload}.${await hmac(payload)}`, maxAge: TTL_MS / 1000 };
}

export async function verifyToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!safeEqual(sig, await hmac(payload))) return null;
  const [login, exp] = payload.split(".");
  return Number(exp) > Date.now() ? login : null;
}

/** Odczyt i weryfikacja sesji urzędnika z nagłówka Cookie żądania API. */
export async function adminFromRequest(req: Request) {
  const raw = req.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return verifyToken(m ? decodeURIComponent(m[1]) : null);
}

export const unauthorized = () => Response.json({ error: "Wymagane logowanie urzędnika" }, { status: 401 });

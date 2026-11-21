// Prosty limiter prób (w pamięci procesu) – ochrona logowania pracowników przed zgadywaniem haseł.
// Produkcja z wieloma instancjami: współdzielony magazyn (np. Redis) lub WAF.
const buckets = new Map<string, { fails: number; until: number }>();
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function clientKey(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Zwraca liczbę sekund blokady albo 0, gdy próba jest dozwolona. */
export function blockedFor(key: string, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.until < now) return 0;
  return b.fails >= MAX_FAILS ? Math.ceil((b.until - now) / 1000) : 0;
}

export function registerFailure(key: string, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.until < now) buckets.set(key, { fails: 1, until: now + WINDOW_MS });
  else b.fails++;
}

export function registerSuccess(key: string) {
  buckets.delete(key);
}

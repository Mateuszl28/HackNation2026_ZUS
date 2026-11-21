"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Landmark, LogIn } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password }) });
    setBusy(false);
    if (r.ok) router.replace("/admin");
    else setErr((await r.json().catch(() => ({}))).error ?? "Błąd logowania");
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4 !p-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent"><Landmark size={28} /></span>
        <div>
          <h1>Panel urzędnika</h1>
          <p className="mt-1 text-sm text-muted">Zarządzanie parametrami prawnymi, organizacjami wsparcia i statystykami. Dostęp wyłącznie dla upoważnionych pracowników ZUS.</p>
        </div>
        <label className="block"><span className="label">Login służbowy</span><input className="input" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required /></label>
        <label className="block"><span className="label">Hasło</span><input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy}><LogIn size={18} /> {busy ? "Logowanie…" : "Zaloguj"}</button>
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-muted"><KeyRound size={14} className="mt-0.5 shrink-0" /> Środowisko demonstracyjne HackNation – dane dostępowe dla jury podano w README repozytorium. W produkcji: logowanie domenowe ZUS (SSO) z rolami.</p>
      </form>
    </div>
  );
}

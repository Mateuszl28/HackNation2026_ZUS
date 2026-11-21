"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogIn, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/session";

/** Funkcje wymagające zalogowania (symulowany mObywatel). */
export const PROTECTED = ["/pulpit", "/plan", "/kalkulator", "/sprawy", "/wnioski"];
export const isProtected = (path: string) => PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { session, ready } = useSession();
  if (!isProtected(path)) return <>{children}</>;
  if (!ready) return <div className="card h-40 animate-pulse" />;
  if (session.user) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg">
      <div className="card space-y-5 !p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-light text-brand"><Lock size={30} /></span>
        <div>
          <h1>Zaloguj się, aby kontynuować</h1>
          <p className="mt-2 text-muted">Kalkulator, dokumenty i wnioski korzystają z danych z Twojego konta w ZUS (ubezpieczenie, podstawa wymiaru, e-ZLA), dlatego wymagają zalogowania.</p>
        </div>
        <Link href={`/logowanie?next=${encodeURIComponent(path + (typeof window !== "undefined" ? window.location.search : ""))}`} className="btn-primary w-full !py-3"><LogIn size={18} /> Zaloguj przez mObywatel</Link>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} /> Bezpieczne logowanie przez login.gov.pl (symulacja)</p>
        <div className="border-t border-slate-200 pt-4 text-sm">
          Bez logowania możesz <Link href="/kreator" className="font-semibold text-accent">sprawdzić uprawnienia w 1 minutę</Link>, zapytać <Link href="/asystent" className="font-semibold text-accent">asystenta</Link> lub przeczytać <Link href="/przewodnik" className="font-semibold text-accent">przewodnik</Link>.
        </div>
      </div>
    </div>
  );
}

"use client";
import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import AuthGate from "@/components/AuthGate";

/** Układ serwisu dla obywatela. Panel urzędnika (/admin) ma własny układ – bez menu i stopki serwisu. */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <a href="#tresc" className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Przejdź do treści</a>
      <Nav />
      <main id="tresc" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:py-10"><AuthGate>{children}</AuthGate></main>
      <footer className="border-t border-slate-200 px-4 py-6 pb-24 text-center text-xs text-muted lg:pb-6">
        Projekt HackNation 2026 · Narzędzie informacyjne – wiążące decyzje wydaje ZUS lub płatnik składek. Logowanie mObywatel, dane ZUS i e-ZLA są symulowane.
        <a href="/admin" className="ml-2 underline decoration-dotted hover:text-ink">Panel urzędnika</a>
      </footer>
    </>
  );
}

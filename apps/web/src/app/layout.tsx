import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description: "Uprawnienia, kalkulator zasiłku macierzyńskiego i przewodnik po wnioskach dla przyszłych rodziców.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#0b7a3e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-dvh antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
        <footer className="border-t border-slate-200 py-6 pb-24 lg:pb-6 text-center text-xs text-muted px-4">
          Projekt HackNation 2026 · Narzędzie informacyjne – wiążące decyzje wydaje ZUS lub płatnik składek. Logowanie mObywatel, dane ZUS i e-ZLA są symulowane.
        </footer>
      </body>
    </html>
  );
}

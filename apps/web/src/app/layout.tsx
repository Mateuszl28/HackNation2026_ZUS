import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteShell from "@/components/SiteShell";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica",
  description: "Uprawnienia, kalkulator zasiłku macierzyńskiego i przewodnik po wnioskach dla przyszłych rodziców.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#0b7a3e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-dvh antialiased">
        <RegisterSW />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}

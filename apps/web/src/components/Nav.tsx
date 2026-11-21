"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Baby, Calculator, FileText, FolderOpen, HeartHandshake, LayoutDashboard, Map, Menu, Settings, X, LogIn, LogOut } from "lucide-react";
import { useSession } from "@/lib/session";

const LINKS = [
  { href: "/pulpit", label: "Mój pulpit", icon: LayoutDashboard },
  { href: "/kalkulator", label: "Kalkulator", icon: Calculator },
  { href: "/przewodnik", label: "Przewodnik", icon: Map },
  { href: "/sprawy", label: "Sprawy / dokumenty", icon: FolderOpen },
  { href: "/wnioski", label: "Wnioski", icon: FileText },
  { href: "/wsparcie", label: "Wsparcie", icon: HeartHandshake },
  { href: "/admin", label: "Admin", icon: Settings },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { session, update } = useSession();
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand text-white"><Baby size={20} /></span>
          <span className="leading-tight">Przewodnik<br className="sm:hidden" /> <span className="text-ink">Rodzica</span></span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`px-3 py-2 rounded-lg text-sm font-medium ${path.startsWith(l.href) ? "bg-brand-light text-brand" : "text-muted hover:bg-slate-100"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {session.user ? (
            <button onClick={() => update(null)} className="btn-ghost text-sm !py-1.5" title="Wyloguj">
              <span className="hidden sm:inline">{session.user.name}</span> <LogOut size={16} />
            </button>
          ) : (
            <Link href="/logowanie" className="btn-primary text-sm !py-1.5"><LogIn size={16} /> Zaloguj</Link>
          )}
          <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-slate-200 bg-white px-4 py-2 grid gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-lg ${path.startsWith(l.href) ? "bg-brand-light text-brand" : ""}`}>
              <l.icon size={18} /> {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

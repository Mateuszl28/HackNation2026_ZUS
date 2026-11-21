"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Baby, Bot, Calculator, ChevronDown, FileText, FolderOpen, HeartHandshake, LayoutDashboard, LogIn, LogOut, Map, MoreHorizontal, Settings, X } from "lucide-react";
import { useSession } from "@/lib/session";
import A11y from "@/components/A11y";

const PRIMARY = [
  { href: "/pulpit", label: "Pulpit", icon: LayoutDashboard },
  { href: "/kalkulator", label: "Kalkulator", icon: Calculator },
  { href: "/asystent", label: "Asystent", icon: Bot },
  { href: "/przewodnik", label: "Przewodnik", icon: Map },
  { href: "/sprawy", label: "Dokumenty", icon: FolderOpen },
];
const MORE = [
  { href: "/wnioski", label: "Wnioski", desc: "Urlopy, ZAM, odpis aktu urodzenia", icon: FileText },
  { href: "/wsparcie", label: "Wsparcie", desc: "Organizacje i pomoc w trudnych chwilach", icon: HeartHandshake },
  { href: "/admin", label: "Panel admina", desc: "Parametry prawne i stawki", icon: Settings },
];
const MOBILE = PRIMARY.slice(0, 4);

export default function Nav() {
  const path = usePathname();
  const { session, update } = useSession();
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const active = (h: string) => path === h || path.startsWith(h + "/");
  const moreActive = MORE.some((m) => active(m.href));

  useEffect(() => {
    setMore(false);
    setSheet(false);
  }, [path]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = session.user?.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md shadow-brand/30 transition group-hover:scale-105">
              <Baby size={22} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold text-ink">Przewodnik Rodzica</span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">zasiłki · urlopy · wnioski</span>
            </span>
          </Link>

          {/* desktop */}
          <nav className="mx-auto hidden items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100/70 p-1 lg:flex">
            {PRIMARY.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${active(l.href) ? "bg-white text-brand shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-ink"}`}
              >
                <l.icon size={16} strokeWidth={active(l.href) ? 2.4 : 2} />
                {l.label}
              </Link>
            ))}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMore((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${moreActive || more ? "bg-white text-brand shadow-sm" : "text-slate-600 hover:bg-white/70"}`}
                aria-expanded={more}
              >
                Więcej <ChevronDown size={14} className={`transition ${more ? "rotate-180" : ""}`} />
              </button>
              {more && (
                <div className="absolute right-0 top-11 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                  {MORE.map((m) => (
                    <Link key={m.href} href={m.href} className={`flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50 ${active(m.href) ? "bg-brand-light/60" : ""}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-light text-brand"><m.icon size={18} /></span>
                      <span>
                        <span className="block text-sm font-semibold text-ink">{m.label}</span>
                        <span className="block text-xs text-muted">{m.desc}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <span className="hidden sm:block"><A11y /></span>
            {session.user ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 sm:pr-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-white">{initials}</span>
                <span className="hidden text-sm font-medium sm:inline">{session.user.name}</span>
                <button onClick={() => update(null)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-slate-100 hover:text-red-600 sm:ml-1 sm:h-7 sm:w-7" title="Wyloguj" aria-label="Wyloguj">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link href="/logowanie" className="btn-primary !rounded-full !px-4 !py-2 text-sm shadow-md shadow-brand/25">
                <LogIn size={16} /> <span className="hidden xl:inline whitespace-nowrap">Zaloguj przez mObywatel</span><span className="xl:hidden">Zaloguj</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* mobile: dolny pasek */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE.map((l) => (
            <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(l.href) ? "text-brand" : "text-slate-500"}`}>
              <span className={`grid h-7 w-12 place-items-center rounded-full transition ${active(l.href) ? "bg-brand-light" : ""}`}>
                <l.icon size={20} strokeWidth={active(l.href) ? 2.4 : 2} />
              </span>
              {l.label}
            </Link>
          ))}
          <button onClick={() => setSheet(true)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${moreActive || active("/sprawy") ? "text-brand" : "text-slate-500"}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${moreActive || active("/sprawy") ? "bg-brand-light" : ""}`}><MoreHorizontal size={20} /></span>
            Więcej
          </button>
        </div>
      </nav>

      {/* mobile: arkusz "Więcej" */}
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <button className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setSheet(false)} aria-label="Zamknij" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-3"><p className="font-semibold">Więcej</p><A11y /></span>
              <button onClick={() => setSheet(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" aria-label="Zamknij"><X size={18} /></button>
            </div>
            <div className="grid gap-1">
              {[{ href: "/sprawy", label: "Dokumenty i sprawy", desc: "Wgraj PDF lub wybierz sprawę", icon: FolderOpen }, ...MORE].map((m) => (
                <Link key={m.href} href={m.href} className={`flex items-center gap-3 rounded-2xl p-3 ${active(m.href) ? "bg-brand-light/60" : "active:bg-slate-100"}`}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-light text-brand"><m.icon size={20} /></span>
                  <span>
                    <span className="block font-semibold">{m.label}</span>
                    <span className="block text-xs text-muted">{m.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

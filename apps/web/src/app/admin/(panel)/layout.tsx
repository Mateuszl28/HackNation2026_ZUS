"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, FolderKanban, ExternalLink, HeartHandshake, History, Landmark, LayoutDashboard, LogOut, Menu, RotateCcw, Save, SlidersHorizontal, UserRound, X } from "lucide-react";
import { AdminProvider, useAdmin } from "@/components/admin/AdminContext";

const NAV = [
  { href: "/admin", label: "Przegląd", icon: LayoutDashboard },
  { href: "/admin/sprawy", label: "Sprawy", icon: FolderKanban },
  { href: "/admin/parametry", label: "Parametry prawne", icon: SlidersHorizontal },
  { href: "/admin/organizacje", label: "Organizacje wsparcia", icon: HeartHandshake },
  { href: "/admin/statystyki", label: "Statystyki", icon: BarChart3 },
  { href: "/admin/historia", label: "Historia zmian", icon: History },
];

function SaveBar() {
  const { dirty, save, discard, msg } = useAdmin();
  const [note, setNote] = useState("");
  if (!dirty && !msg) return null;
  return (
    <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
      {msg && !dirty ? (
        <p className={`text-sm font-medium ${msg.ok ? "text-brand" : "text-red-700"}`}>{msg.ok ? "✓" : "✕"} {msg.text}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-semibold text-amber-700">● Niezapisane zmiany</span>
          <input className="input !w-full sm:!w-80" placeholder="Podstawa zmiany, np. nowelizacja – Dz.U. 2027 poz. …" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary" onClick={async () => { if (await save(note)) setNote(""); }}><Save size={16} /> Zapisz i opublikuj</button>
          <button className="btn-ghost" onClick={discard}>Odrzuć</button>
          {msg && !msg.ok && <span className="text-sm text-red-700">{msg.text}</span>}
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { official, roleLabel, logout, saved, reset } = useAdmin();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/admin" ? path === "/admin" : path.startsWith(h));

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active(n.href) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
          <n.icon size={18} /> {n.label}
        </Link>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
        <button onClick={() => { if (confirm("Przywrócić wszystkie parametry do wartości domyślnych?")) reset(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"><RotateCcw size={18} /> Przywróć domyślne</button>
        <a href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"><ExternalLink size={18} /> Serwis dla obywateli</a>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-slate-100">
      <aside className="sticky top-0 hidden h-dvh print:!hidden w-64 shrink-0 flex-col bg-gradient-to-b from-[#123a5c] to-[#0c2740] lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Landmark size={20} /></span>
          <span className="leading-tight"><span className="block font-bold">Panel urzędnika</span><span className="text-xs text-white/60">Przewodnik Rodzica · ZUS</span></span>
        </div>
        {sidebar}
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} aria-label="Zamknij menu" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-[#123a5c] to-[#0c2740]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white"><span className="font-bold">Panel urzędnika</span><button onClick={() => setOpen(false)} aria-label="Zamknij"><X /></button></div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 print:hidden items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <p className="truncate text-sm text-muted">
            {saved ? <>Parametry <b className="text-ink">v{saved.params.version}</b> · obowiązują od {saved.params.updatedAt}</> : "Ładowanie…"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 text-sm sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#123a5c] text-white"><UserRound size={15} /></span>
              {official || "…"} <span className="text-xs text-muted">· {roleLabel || "…"}</span>
            </span>
            <button onClick={logout} className="btn-ghost !py-1.5 text-sm"><LogOut size={15} /> Wyloguj</button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        <SaveBar />
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <Shell>{children}</Shell>
    </AdminProvider>
  );
}

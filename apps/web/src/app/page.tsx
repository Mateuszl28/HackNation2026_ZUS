"use client";
import Link from "next/link";
import { Bot, Briefcase, Calculator, FileText, FolderOpen, HeartHandshake, LayoutDashboard, ListChecks, Lock, Map, Smartphone, Sparkles } from "lucide-react";
import { useSession } from "@/lib/session";

const PUBLIC = [
  { href: "/kreator", icon: Sparkles, title: "Sprawdź uprawnienia w 1 minutę", text: "5 prostych pytań – dowiesz się, czy przysługuje Ci zasiłek i ile może wynieść." },
  { href: "/asystent", icon: Bot, title: "Zapytaj asystenta", text: "81,5% czy 100% + 70%? Co przysługuje tacie? Jak jest przy działalności?" },
  { href: "/przewodnik", icon: Map, title: "Przewodnik krok po kroku", text: "Od ciąży i L4 z kodem „B”, przez poród, po powrót do pracy – z terminami." },
  { href: "/pracodawca", icon: Briefcase, title: "Dla pracodawcy", text: "Kto wypłaca zasiłek, ile kosztuje wynagrodzenie chorobowe, obowiązki i terminy." },
  { href: "/wsparcie", icon: HeartHandshake, title: "Wsparcie w trudnych chwilach", text: "Strata dziecka, wcześniak, ciężka choroba – uprawnienia i organizacje." },
];
const ACCOUNT = [
  { href: "/pulpit", icon: LayoutDashboard, title: "Dane z ZUS", text: "Ubezpieczenie, zadłużenie składkowe, e-ZLA i status Twoich wniosków." },
  { href: "/kalkulator", icon: Calculator, title: "Pełny kalkulator", text: "Oboje rodzice, 81,5%, „Za życiem”, wcześniak, adopcja, praca na część etatu, porównanie wariantów." },
  { href: "/plan", icon: ListChecks, title: "Mój plan", text: "Spersonalizowana checklista z terminami i eksportem do kalendarza." },
  { href: "/sprawy", icon: FolderOpen, title: "Twoje dokumenty", text: "Wgraj Z-3, ZAM lub poświadczenie – odczytamy dane i podstawę wymiaru." },
  { href: "/wnioski", icon: FileText, title: "Wnioski online", text: "Wnioski o urlopy wypełnione z planu, ZAM do ZUS, odpis aktu urodzenia." },
];

export default function Home() {
  const { session } = useSession();
  const logged = !!session.user;
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white sm:p-12">
        <p className="chip mb-4 bg-white/15 text-white">Ciąża · Poród · Adopcja · Rodzina zastępcza</p>
        <h1 className="max-w-2xl !text-3xl sm:!text-5xl">Wiesz, co Ci przysługuje – zanim urodzi się dziecko.</h1>
        <p className="mt-4 max-w-xl text-lg text-white/85">Policz zasiłek dla obojga rodziców, zaplanuj urlopy i dowiedz się, gdzie złożyć dokumenty – na podstawie Twojej sytuacji.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/kreator" className="btn bg-white text-brand hover:bg-brand-light"><Sparkles size={18} /> Sprawdź uprawnienia w 1 minutę</Link>
          {logged ? (
            <Link href="/pulpit" className="btn border border-white/40 hover:bg-white/10">Przejdź do pulpitu</Link>
          ) : (
            <Link href="/logowanie" className="btn border border-white/40 hover:bg-white/10">Zaloguj przez mObywatel</Link>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3">Bez logowania</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC.map((t) => (
            <Link key={t.href} href={t.href} className="card group transition hover:border-brand hover:shadow-md">
              <t.icon className="mb-3 text-brand" />
              <h3 className="font-semibold group-hover:text-brand">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2">{!logged && <Lock size={18} className="text-muted" />} {logged ? "Twoje konto" : "Po zalogowaniu przez mObywatel"}</h2>
          {!logged && <Link href="/logowanie" className="text-sm font-semibold text-accent">Zaloguj się →</Link>}
        </div>
        {!logged && <p className="-mt-1 mb-3 text-sm text-muted">Te funkcje korzystają z Twoich danych w ZUS (ubezpieczenie, podstawa wymiaru, e-ZLA), dlatego wymagają zalogowania.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACCOUNT.map((t) => (
            <Link key={t.href} href={t.href} className={`card group relative transition hover:border-brand hover:shadow-md ${logged ? "" : "bg-slate-50/60"}`}>
              {!logged && <Lock size={14} className="absolute right-4 top-4 text-slate-400" />}
              <t.icon className="mb-3 text-brand" />
              <h3 className="font-semibold group-hover:text-brand">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Smartphone className="shrink-0 text-accent" size={32} />
        <div className="flex-1">
          <h2>Aplikacja mobilna</h2>
          <p className="text-sm text-muted">Ten sam silnik obliczeń w aplikacji na Android/iOS. Strona jest w pełni responsywna i można ją zainstalować jako aplikację (PWA).</p>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { Calculator, FolderOpen, Map, HeartHandshake, ShieldCheck, FileText, Smartphone } from "lucide-react";

const TILES = [
  { href: "/kalkulator", icon: Calculator, title: "Zintegrowany kalkulator", text: "Macierzyński, rodzicielski, ojcowski, uzupełniający, adopcja, praca na część etatu, 81,5% – w jednym miejscu." },
  { href: "/przewodnik", icon: Map, title: "Przewodnik krok po kroku", text: "Od ciąży i L4 z kodem „B”, przez poród, po powrót do pracy – z terminami." },
  { href: "/sprawy", icon: FolderOpen, title: "Sprawdź swoje dokumenty", text: "Wgraj Z-3, ZAM lub poświadczenie – odczytamy dane i sprawdzimy ubezpieczenie." },
  { href: "/wnioski", icon: FileText, title: "Wnioski online", text: "Wniosek o urlopy do pracodawcy, ZAM do ZUS, odpis aktu urodzenia." },
  { href: "/pulpit", icon: ShieldCheck, title: "Dane z ZUS", text: "Ubezpieczenie, zadłużenie składkowe, e-ZLA – po zalogowaniu mObywatelem." },
  { href: "/wsparcie", icon: HeartHandshake, title: "Wsparcie w trudnych chwilach", text: "Strata dziecka, wcześniak, ciężka choroba – organizacje i uprawnienia." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark text-white p-6 sm:p-12 relative overflow-hidden">
        <p className="chip bg-white/15 text-white mb-4">Ciąża · Poród · Adopcja · Rodzina zastępcza</p>
        <h1 className="!text-3xl sm:!text-5xl max-w-2xl">Wiesz, co Ci przysługuje – zanim urodzi się dziecko.</h1>
        <p className="mt-4 max-w-xl text-white/85 text-lg">Policz zasiłek dla obojga rodziców, zaplanuj urlopy i dowiedz się, gdzie złożyć dokumenty – na podstawie Twojej sytuacji.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/logowanie" className="btn bg-white text-brand hover:bg-brand-light">Zaloguj przez mObywatel</Link>
          <Link href="/kalkulator" className="btn border border-white/40 hover:bg-white/10">Policz bez logowania</Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card hover:border-brand hover:shadow-md transition group">
            <t.icon className="text-brand mb-3" />
            <h2 className="group-hover:text-brand">{t.title}</h2>
            <p className="text-sm text-muted mt-1">{t.text}</p>
          </Link>
        ))}
      </section>

      <section className="card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Smartphone className="text-accent shrink-0" size={32} />
        <div className="flex-1">
          <h2>Aplikacja mobilna</h2>
          <p className="text-sm text-muted">Ten sam silnik obliczeń w aplikacji na Android/iOS (Expo). Strona jest w pełni responsywna i działa też jako PWA.</p>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Landmark, Play, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { calculate, DEMO_CASES, recommendDecision, DECISION_LABELS } from "@zus/engine";
import { useSession } from "@/lib/session";

const STEPS = [
  { who: "Obywatel", title: "Zaloguj się jako Katarzyna (działalność, zaległa składka)", desc: "Pulpit pokaże zadłużenie 1240 zł, ostrzeżenia i szacowany zasiłek.", action: "citizen:kasia-jdg:/pulpit" },
  { who: "Obywatel", title: "Złóż wniosek ZAM", desc: "Wnioski → ZAM: okresy z planu wpiszą się same → „Wyślij do: ZUS”.", action: "citizen:kasia-jdg:/wnioski" },
  { who: "Urzędnik", title: "Otwórz kolejkę spraw", desc: "Sprawy → Katarzyna: rekomendacja systemu „Wezwanie do uzupełnienia” (art. 49). Wydaj wezwanie.", action: "official:/admin/sprawy/kasia-jdg" },
  { who: "Obywatel", title: "Odpowiedz na wezwanie", desc: "Dzwonek pokaże powiadomienie. Na pulpicie prześlij „Potwierdzenie spłaty zadłużenia” (dowolny PDF).", action: "citizen:kasia-jdg:/pulpit" },
  { who: "Pracodawca", title: "Wyślij Z-3 za pracownicę", desc: "Dla pracodawcy → „Wystaw zaświadczenie Z-3” → wybierz osobę → „Wyślij do ZUS”. Kontrola krzyżowa porówna dane.", action: "page:/pracodawca" },
  { who: "Urzędnik", title: "Wydaj decyzję", desc: "Sprawa wróciła ze statusem „Uzupełniono dokumenty”. Przyznaj świadczenie – obywatel zobaczy pismo.", action: "official:/admin/sprawy/kasia-jdg" },
];
const ROLE_ICON = { Obywatel: UserRound, Urzędnik: Landmark, Pracodawca: Briefcase } as const;

export default function DemoPage() {
  const router = useRouter();
  const { update } = useSession();
  const [msg, setMsg] = useState("");

  const asCitizen = (caseId: string, to: string) => {
    const c = DEMO_CASES.find((x) => x.id === caseId)!;
    update({ user: { name: c.title.split(" – ")[0], caseId }, input: c.input, applications: [] });
    router.push(to);
  };
  const asOfficial = async (to: string, role: "official" | "manager" = "official") => {
    const r = await fetch(`/api/demo/official?role=${role}`, { method: "POST" });
    if (r.ok) router.push(to);
    else setMsg("Szybkie logowanie wyłączone – zaloguj się na /admin/logowanie.");
  };
  const run = (action: string) => {
    const [kind, a, b] = action.split(":");
    if (kind === "citizen") asCitizen(a, b);
    else if (kind === "official") asOfficial(a);
    else router.push(a);
  };
  const reset = async () => {
    const r = await fetch("/api/demo/reset", { method: "POST" });
    update(null);
    setMsg(r.ok ? "✓ Wyczyszczono sprawy, decyzje, dokumenty i statystyki. Wylogowano obywatela." : "Reset niedostępny (tryb demo wyłączony).");
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-br from-[#123a5c] to-[#0c2740] p-6 text-white sm:p-10">
        <p className="chip mb-3 bg-white/15 text-white">Dla jury HackNation 2026</p>
        <h1 className="!text-3xl sm:!text-4xl">Demo w 5 minut</h1>
        <p className="mt-3 max-w-2xl text-white/80">Trzy role w jednym procesie: <b>obywatel</b> planuje i składa wniosek, <b>pracodawca</b> wysyła Z-3, <b>urzędnik ZUS</b> weryfikuje i wydaje decyzję. Logowanie mObywatel i dane z ZUS są symulowane. Panel urzędnika: <code className="rounded bg-white/15 px-1">urzednik</code> / <code className="rounded bg-white/15 px-1">zus2026</code>, kierownik: <code className="rounded bg-white/15 px-1">kierownik</code> / <code className="rounded bg-white/15 px-1">zus2026k</code>.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="btn bg-white text-[#123a5c]" onClick={() => run(STEPS[0].action)}><Play size={16} /> Zacznij scenariusz</button>
          <button className="btn border border-white/40 hover:bg-white/10" onClick={reset}><RotateCcw size={16} /> Wyczyść dane demo</button>
        </div>
        {msg && <p className="mt-3 text-sm text-white/90">{msg}</p>}
      </section>

      <section>
        <h2 className="mb-3">Scenariusz: zasiłek przy działalności z zaległą składką</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const Icon = ROLE_ICON[s.who as keyof typeof ROLE_ICON];
            return (
              <li key={i} className="card flex flex-col gap-3 !p-4 sm:flex-row sm:items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#123a5c] font-bold text-white">{i + 1}</span>
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><Icon size={13} /> {s.who}</p>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted">{s.desc}</p>
                </div>
                <button className="btn-ghost shrink-0 !py-1.5 text-sm" onClick={() => run(s.action)}>Przejdź →</button>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-1">Wejdź jako dowolna osoba</h2>
        <p className="mb-3 text-sm text-muted">8 fikcyjnych spraw obejmujących różne sytuacje. Rekomendacja = co podpowie system urzędnikowi.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_CASES.map((c) => {
            const r = calculate(c.input);
            const rec = recommendDecision(c.input, r, c.zusData).type;
            return (
              <button key={c.id} onClick={() => asCitizen(c.id, "/pulpit")} className="card !p-4 text-left transition hover:border-brand">
                <p className="font-semibold">{c.title.split(" – ")[0]}</p>
                <p className="text-xs text-muted">{c.title.split(" – ")[1]}</p>
                <p className={`chip mt-2 ${rec === "grant" ? "bg-brand-light text-brand" : rec === "refuse" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{DECISION_LABELS[rec]}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button className="card !p-5 text-left transition hover:border-[#123a5c]" onClick={() => asOfficial("/admin")}><Landmark className="mb-2 text-[#123a5c]" /><p className="font-semibold">Panel urzędnika</p><p className="text-sm text-muted">Kolejka spraw, decyzje, parametry, statystyki</p></button>
        <button className="card !p-5 text-left transition hover:border-violet-600" onClick={() => asOfficial("/admin/sprawy", "manager")}><Landmark className="mb-2 text-violet-700" /><p className="font-semibold">Panel kierownika</p><p className="text-sm text-muted">Zatwierdzanie decyzji odmownych (zasada dwóch par oczu)</p></button>
        <button className="card !p-5 text-left transition hover:border-brand" onClick={() => router.push("/pracodawca")}><Briefcase className="mb-2 text-brand" /><p className="font-semibold">Pracodawca</p><p className="text-sm text-muted">Koszty, obowiązki, wysyłka Z-3</p></button>
        <button className="card !p-5 text-left transition hover:border-brand" onClick={() => router.push("/kreator")}><Sparkles className="mb-2 text-brand" /><p className="font-semibold">Bez logowania</p><p className="text-sm text-muted">Kreator, asystent, „Co jeśli…?”</p></button>
      </section>
    </div>
  );
}

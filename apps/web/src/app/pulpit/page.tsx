"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileHeart, MessageSquare, RefreshCw, Wallet, XCircle } from "lucide-react";
import { calculate, calculatePregnancySickness, diffDays, pln, type CalcInput } from "@zus/engine";
import { useParams, useSession } from "@/lib/session";

interface ZusData {
  source: string;
  fetchedAt: string;
  insurance: { title: string; from: string; to?: string; sickness: string; base: number }[];
  debt: { amount: number; asOf: string; certificate: string };
  ezla: { from: string; to: string; code: string; doctor: string }[];
  calcInput: CalcInput;
}

export default function Dashboard() {
  const { session, ready, update } = useSession();
  const params = useParams();
  const [data, setData] = useState<ZusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  const load = () => {
    if (!session.user) return;
    setLoading(true);
    fetch(`/api/zus/${session.user.caseId}`).then((r) => r.json()).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [session.user?.caseId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  if (!session.user)
    return (
      <div className="card max-w-lg mx-auto text-center space-y-4">
        <h1>Mój pulpit</h1>
        <p className="text-muted">Zaloguj się (symulacja mObywatel), aby pobrać dane o ubezpieczeniu, zadłużeniu i zaświadczeniach e-ZLA.</p>
        <Link href="/logowanie" className="btn-primary">Zaloguj się</Link>
      </div>
    );

  const result = data ? calculate(data.calcInput, params) : null;
  const insuredNow = data?.insurance.some((i) => i.sickness !== "brak" && (!i.to || i.to >= data.calcInput.eventDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <p className="text-muted text-sm">Dzień dobry,</p>
          <h1>{session.user.name}</h1>
        </div>
        <button onClick={load} className="btn-ghost text-sm"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Pobierz ponownie z ZUS</button>
      </div>

      {!data ? (
        <div className="card animate-pulse h-40" />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`card border-l-4 ${insuredNow ? "border-l-brand" : "border-l-red-500"}`}>
              <div className="flex items-center gap-2 font-semibold">{insuredNow ? <CheckCircle2 className="text-brand" /> : <XCircle className="text-red-500" />} Ubezpieczenie chorobowe</div>
              <p className="text-sm text-muted mt-2">{insuredNow ? "Podlegasz ubezpieczeniu w dniu porodu/przyjęcia dziecka." : "W dniu porodu nie będziesz podlegać ubezpieczeniu chorobowemu."}</p>
            </div>
            <div className={`card border-l-4 ${data.debt.amount > 0 ? "border-l-amber-500" : "border-l-brand"}`}>
              <div className="flex items-center gap-2 font-semibold"><Wallet className={data.debt.amount > 0 ? "text-amber-500" : "text-brand"} /> Zadłużenie składkowe</div>
              <p className="text-2xl font-bold mt-2">{pln(data.debt.amount)}</p>
              <p className="text-xs text-muted">Zaświadczenie {data.debt.certificate} · na dzień {data.debt.asOf}</p>
            </div>
            <div className="card border-l-4 border-l-accent">
              <div className="flex items-center gap-2 font-semibold"><FileHeart className="text-accent" /> Szacowany zasiłek łącznie</div>
              <p className="text-2xl font-bold mt-2">{pln(result!.total)}</p>
              <Link href="/kalkulator" className="text-sm text-accent font-semibold">Zmień plan w kalkulatorze →</Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card">
              <h2 className="mb-3">Okresy ubezpieczenia</h2>
              {data.insurance.length === 0 && <p className="text-sm text-muted">Brak zgłoszeń do ubezpieczenia chorobowego.</p>}
              <ul className="divide-y divide-slate-100">
                {data.insurance.map((i, k) => (
                  <li key={k} className="py-2 text-sm">
                    <p className="font-medium">{i.title}</p>
                    <p className="text-muted">{i.from} – {i.to ?? "obecnie"} · chorobowe: {i.sickness} · podstawa {pln(i.base)}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card">
              <h2 className="mb-3">Zaświadczenia lekarskie e-ZLA</h2>
              {data.ezla.length === 0 && <p className="text-sm text-muted">Brak zaświadczeń.</p>}
              <ul className="divide-y divide-slate-100">
                {data.ezla.map((e, k) => (
                  <li key={k} className="py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span>{e.from} – {e.to} · {e.doctor}</span>
                      <span className={`chip ${e.code === "B" ? "bg-brand-light text-brand" : "bg-slate-100"}`}>kod {e.code} {e.code === "B" && "· 100%"}</span>
                    </div>
                    {(() => {
                      const days = diffDays(e.from, e.to) + 1;
                      const s = calculatePregnancySickness({ parent: data.calcInput.mother, startDate: e.from, days }, params);
                      return (
                        <p className="mt-1 text-xs text-muted">
                          {days} dni · {s.eligible ? <>wynagrodzenie chorobowe {pln(s.employerAmount)} ({s.employerDays} dni) + zasiłek {pln(s.zusAmount)} = <b className="text-ink">{pln(s.total)}</b></> : "brak prawa do zasiłku (okres wyczekiwania)"}
                        </p>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {result!.notices.filter((n) => n.level !== "info").length > 0 && (
            <section className="card">
              <h2 className="mb-3 flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Na co uważać</h2>
              <ul className="space-y-2">
                {result!.notices.filter((n) => n.level !== "info").map((n, k) => (
                  <li key={k} className={`rounded-xl p-3 text-sm ${n.level === "danger" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}><b>{n.title}.</b> {n.text}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="mb-2 flex items-center gap-2"><MessageSquare className="text-accent" /> Zapytaj ZUS (symulacja PUE/eZUS)</h2>
            {sent ? (
              <p className="text-brand text-sm">✓ Wiadomość wysłana do PUE/eZUS. Odpowiedź pojawi się w skrzynce na koncie (symulacja).</p>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input className="input" placeholder="Np. Czy mogę przejąć część urlopu macierzyńskiego?" value={msg} onChange={(e) => setMsg(e.target.value)} />
                <button className="btn-primary" disabled={!msg} onClick={() => setSent(true)}>Wyślij</button>
              </div>
            )}
          </section>
          <button className="text-sm text-accent" onClick={() => update({ input: data.calcInput })}>Wczytaj moje dane do kalkulatora</button>
        </>
      )}
    </div>
  );
}

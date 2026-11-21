"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { DEMO_CASES } from "@zus/engine";
import { useSession } from "@/lib/session";

export default function Login() {
  const [caseId, setCaseId] = useState(DEMO_CASES[0].id);
  const [step, setStep] = useState<"choose" | "code" | "ok">("choose");
  const [code] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (step !== "code") return;
    const t = setTimeout(() => setStep("ok"), 2500);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step !== "ok") return;
    const c = DEMO_CASES.find((c) => c.id === caseId)!;
    update({ user: { name: c.title.split(" – ")[0], caseId }, input: c.input });
    const t = setTimeout(() => router.push("/pulpit"), 900);
    return () => clearTimeout(t);
  }, [step, caseId, update, router]);

  return (
    <div className="max-w-md mx-auto card space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted"><ShieldCheck size={16} /> Symulacja logowania – login.gov.pl / mObywatel</div>
      <h1>Zaloguj się przez mObywatel</h1>
      {step === "choose" && (
        <>
          <label className="label">Tożsamość testowa (sprawa demonstracyjna)</label>
          <select className="input" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {DEMO_CASES.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="btn-primary w-full" onClick={() => setStep("code")}><Smartphone size={18} /> Zaloguj aplikacją mObywatel</button>
        </>
      )}
      {step === "code" && (
        <div className="text-center space-y-4">
          <QrCode size={120} className="mx-auto text-ink" />
          <p>Potwierdź w aplikacji mObywatel kod:</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-brand">{code}</p>
          <p className="text-sm text-muted animate-pulse">Oczekiwanie na potwierdzenie…</p>
        </div>
      )}
      {step === "ok" && <p className="text-center text-brand font-semibold">✓ Zalogowano. Pobieramy dane z ZUS…</p>}
    </div>
  );
}

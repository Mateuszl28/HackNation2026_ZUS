"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "@zus/engine";
import { useSession } from "@/lib/session";

interface Msg { role: "user" | "bot"; text: string; source?: string }

export default function Assistant() {
  const { session } = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: "Cześć! Pomogę zrozumieć, co Ci przysługuje. Odpowiadam na podstawie Twojego planu z kalkulatora – zapytaj o kwoty, urlopy, dokumenty albo ryzyka." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ("");
    setBusy(true);
    const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, input: session.input }) })
      .then((r) => r.json())
      .catch(() => ({ text: "Błąd połączenia. Spróbuj ponownie." }));
    setMsgs((m) => [...m, { role: "bot", text: r.text, source: r.source }]);
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-10rem)] min-h-[480px]">
      <div className="mb-4">
        <h1>Asystent</h1>
        <p className="text-muted text-sm">{session.input ? "Odpowiadam z uwzględnieniem Twojego planu z kalkulatora." : "Wskazówka: zapisz plan w kalkulatorze, a odpowiedzi będą spersonalizowane."}</p>
      </div>
      <div className="card flex-1 overflow-y-auto space-y-4 !p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user" ? "bg-accent text-white" : "bg-brand-light text-brand"}`}>{m.role === "user" ? <User size={16} /> : <Bot size={16} />}</span>
            <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${m.role === "user" ? "bg-accent text-white" : "bg-slate-100"}`}>
              {m.text}
              {m.source === "ai" && <span className="mt-1 flex items-center gap-1 text-[10px] text-muted"><Sparkles size={10} /> odpowiedź wspierana AI na podstawie wyników kalkulatora</span>}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted animate-pulse pl-11">Piszę…</p>}
        <div ref={end} />
      </div>
      <div className="flex flex-wrap gap-2 my-3">
        {SUGGESTED_QUESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="chip !py-1.5 !px-3 bg-white border border-slate-300 hover:border-brand">{s}</button>)}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input className="input" placeholder="Zadaj pytanie…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" disabled={busy || !q.trim()} aria-label="Wyślij"><Send size={18} /></button>
      </form>
    </div>
  );
}

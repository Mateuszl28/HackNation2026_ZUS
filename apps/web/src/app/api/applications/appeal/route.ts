import { DEMO_CASES } from "@zus/engine";
import { addAppeal, forCase } from "@/lib/cases-store";

/** POST { caseId, decisionId, text } – odwołanie obywatela od decyzji (w terminie miesiąca od doręczenia). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !DEMO_CASES.some((c) => c.id === b.caseId)) return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  const text = typeof b.text === "string" ? b.text.trim() : "";
  if (text.length < 20) return Response.json({ error: "Opisz, dlaczego nie zgadzasz się z decyzją (min. 20 znaków)." }, { status: 400 });
  const { decisions, appeals } = await forCase(b.caseId);
  const d = decisions.find((x) => x.id === b.decisionId);
  if (!d || d.type === "request") return Response.json({ error: "Odwołanie przysługuje od decyzji (nie od wezwania)." }, { status: 400 });
  if (Date.now() - new Date(d.at).getTime() > 31 * 86400000) return Response.json({ error: "Minął miesięczny termin na odwołanie." }, { status: 400 });
  if (appeals.some((a) => a.decisionId === d.id)) return Response.json({ error: "Odwołanie od tej decyzji zostało już złożone." }, { status: 409 });
  return Response.json(await addAppeal({ id: `ODW/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`, caseId: b.caseId, decisionId: d.id, text: text.slice(0, 4000), at: new Date().toISOString(), status: "pending" }));
}

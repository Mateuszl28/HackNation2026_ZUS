import { answerQuestion, calculate, type CalcInput } from "@zus/engine";
import { getConfig } from "@/lib/params-store";

/**
 * POST /api/assistant – { question, input? } → { text, source }
 * Domyślnie: asystent regułowy (deterministyczny, z danymi z kalkulatora).
 * Opcjonalnie AI: ustaw AI_GATEWAY_API_KEY i AI_MODEL – model dostaje wynik kalkulatora i odpowiedź regułową
 * jako kontekst i ma jedynie przeformułować/uzupełnić ją prostym językiem (bez zmiany liczb).
 */
export async function POST(req: Request) {
  const { question, input } = (await req.json()) as { question: string; input?: CalcInput };
  if (!question?.trim()) return Response.json({ error: "Brak pytania" }, { status: 400 });
  const { params } = await getConfig();
  const result = input ? calculate({ ...input, plan: input.plan ?? {} }, params) : undefined;
  const rules = answerQuestion(question, params, input, result);

  const key = process.env.AI_GATEWAY_API_KEY;
  const model = process.env.AI_MODEL;
  if (!key || !model) return Response.json(rules);

  try {
    const context = {
      parametry: { stopy: params.rates, rodzicielski: params.parentalWeeks, nieprzenoszalne: params.parentalNonTransferableWeeks },
      wynik: result && { matka: result.mother, ojciec: result.father, okresy: result.periods.map((p) => ({ okres: p.label, od: p.start, do: p.end, kwota: p.total })), ostrzezenia: result.notices.map((n) => n.title) },
      odpowiedzRegulowa: rules.text,
    };
    const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [
          { role: "system", content: "Jesteś asystentem przyszłych rodziców w sprawach zasiłków ZUS. Odpowiadaj po polsku, krótko i prosto. Używaj WYŁĄCZNIE liczb i reguł z kontekstu – nie wymyślaj kwot ani przepisów. Gdy nie wiesz – odeślij do PUE/eZUS. Kontekst: " + JSON.stringify(context) },
          { role: "user", content: question },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content;
    return Response.json(text ? { text, intent: rules.intent, source: "ai" } : rules);
  } catch {
    return Response.json(rules);
  }
}

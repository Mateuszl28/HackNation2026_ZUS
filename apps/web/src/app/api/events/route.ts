import { trackPlan } from "@/lib/analytics";

const ALLOWED_SCENARIOS = new Set(["birth", "adoption", "foster"]);
const ALLOWED_TITLES = new Set(["employment", "mandate", "business", "none"]);

/** POST /api/events – anonimowe zdarzenie „zapisano plan” (kategorie, bez kwot i danych osobowych). */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    await trackPlan({
      scenario: ALLOWED_SCENARIOS.has(b?.scenario) ? b.scenario : undefined,
      titles: (Array.isArray(b?.titles) ? b.titles : []).filter((t: string) => ALLOWED_TITLES.has(t)).slice(0, 2),
      risks: (Array.isArray(b?.risks) ? b.risks : []).filter((r: unknown) => typeof r === "string").slice(0, 20),
    });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}

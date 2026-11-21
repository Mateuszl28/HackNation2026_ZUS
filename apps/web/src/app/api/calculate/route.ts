import { calculate, type CalcInput } from "@zus/engine";
import { getConfig } from "@/lib/params-store";

/** POST /api/calculate – body: CalcInput → CalcResult */
export async function POST(req: Request) {
  try {
    const input = (await req.json()) as CalcInput;
    if (!input?.eventDate || !input.mother || !input.father) return Response.json({ error: "Wymagane: eventDate, mother, father" }, { status: 400 });
    const { params } = await getConfig();
    return Response.json(calculate({ ...input, plan: input.plan ?? {} }, params));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}

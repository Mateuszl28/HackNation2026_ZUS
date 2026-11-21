import { calculatePregnancySickness, type SicknessInput } from "@zus/engine";
import { getConfig } from "@/lib/params-store";

/** POST /api/sickness – zasiłek chorobowy w ciąży */
export async function POST(req: Request) {
  const input = (await req.json()) as SicknessInput;
  const { params } = await getConfig();
  return Response.json(calculatePregnancySickness(input, params));
}

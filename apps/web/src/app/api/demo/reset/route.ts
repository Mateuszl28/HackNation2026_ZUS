import { resetCases } from "@/lib/cases-store";
import { resetStats } from "@/lib/analytics";

const demoEnabled = () => (process.env.DEMO_MODE ?? "on") !== "off";

/** POST – wyczyszczenie spraw, decyzji, dokumentów i statystyk (tylko tryb demo; wyłącz: DEMO_MODE=off). */
export async function POST() {
  if (!demoEnabled()) return Response.json({ error: "Tryb demo wyłączony" }, { status: 403 });
  await resetCases();
  await resetStats();
  return Response.json({ ok: true });
}

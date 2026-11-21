import { DEMO_CASES } from "@zus/engine";

/**
 * GET /api/zus/:id – SYMULACJA pobrania danych z systemów ZUS (ubezpieczenia, zadłużenie, e-ZLA)
 * dla zalogowanego (przez symulowany mObywatel) użytkownika.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = DEMO_CASES.find((x) => x.id === id);
  if (!c) return Response.json({ error: "Nie znaleziono" }, { status: 404 });
  await new Promise((r) => setTimeout(r, 400)); // opóźnienie "systemu"
  return Response.json({
    source: "SYMULACJA – CSI ZUS",
    fetchedAt: new Date().toISOString(),
    insurance: c.zusData.insurance,
    debt: { amount: c.zusData.debt, asOf: c.input.eventDate, certificate: `ZUS-ZAŚW/${id.toUpperCase()}/${new Date().getFullYear()}` },
    ezla: c.zusData.ezla,
    calcInput: c.input,
  });
}

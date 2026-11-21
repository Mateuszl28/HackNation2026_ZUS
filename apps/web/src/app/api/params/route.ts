import { getConfig, saveConfig, resetConfig } from "@/lib/params-store";
import { adminFromRequest, unauthorized } from "@/lib/admin-auth";

/** GET – parametry (publiczne, używa ich web i aplikacja mobilna); PUT – zmiana (tylko urzędnik). */
export async function GET() {
  return Response.json(await getConfig());
}

export async function PUT(req: Request) {
  const official = await adminFromRequest(req);
  if (!official) return unauthorized();
  const body = await req.json();
  if (body?.reset) return Response.json(await resetConfig());
  if (!body?.params?.rates) return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  return Response.json(await saveConfig({ params: body.params, support: body.support }, [body.note, `(${official})`].filter(Boolean).join(" ")));
}

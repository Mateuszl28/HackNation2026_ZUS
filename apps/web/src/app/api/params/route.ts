import { getConfig, saveConfig, resetConfig } from "@/lib/params-store";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "admin";

export async function GET() {
  return Response.json(await getConfig());
}

export async function PUT(req: Request) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) return Response.json({ error: "Brak uprawnień" }, { status: 401 });
  const body = await req.json();
  if (body?.reset) return Response.json(await resetConfig());
  if (!body?.params?.rates) return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  return Response.json(await saveConfig({ params: body.params, support: body.support }, body.note));
}

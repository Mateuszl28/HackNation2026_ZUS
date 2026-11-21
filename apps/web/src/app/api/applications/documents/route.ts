import { DEMO_CASES } from "@zus/engine";
import { addDocument } from "@/lib/cases-store";

/** POST – obywatel dołącza dokument do swojej sprawy (dane odczytane z pliku; sam plik nie jest przechowywany w demo). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !DEMO_CASES.some((c) => c.id === b.caseId) || typeof b.name !== "string" || !b.name.trim()) return Response.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  const fields = Array.isArray(b.fields) ? b.fields.filter((f: { label?: unknown; value?: unknown }) => typeof f?.label === "string" && typeof f?.value === "string").slice(0, 20) : [];
  return Response.json(
    await addDocument({
      id: `DOK-${Date.now().toString().slice(-8)}`,
      caseId: b.caseId,
      name: b.name.slice(0, 200),
      fileName: typeof b.fileName === "string" ? b.fileName.slice(0, 200) : undefined,
      formType: typeof b.formType === "string" ? b.formType.slice(0, 120) : undefined,
      fields,
      inResponseTo: typeof b.inResponseTo === "string" ? b.inResponseTo.slice(0, 40) : undefined,
      at: Date.now(),
    }),
  );
}

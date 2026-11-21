import { DEMO_CASES } from "@zus/engine";

/** GET /api/cases – lista spraw demonstracyjnych */
export async function GET() {
  return Response.json(DEMO_CASES.map(({ id, title, description, expected }) => ({ id, title, description, expected })));
}

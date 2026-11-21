import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyToken } from "@/lib/admin-auth";

/** Panel urzędnika: bez ważnej sesji urzędnika przekierowanie do logowania. */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin/logowanie")) return NextResponse.next();
  if (await verifyToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/logowanie";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };

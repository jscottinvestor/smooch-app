import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/auth/"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    // Fail open in dev so first-run isn't a lockout; fail closed in production.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("APP_PASSWORD not configured", { status: 500 });
    }
    return NextResponse.next();
  }

  const expected = await hashPassword(appPassword);
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === expected) return NextResponse.next();

  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all routes except Next internals and asset files (anything with a dot).
  matcher: ["/((?!_next/|favicon|.*\\..*).*)"],
};

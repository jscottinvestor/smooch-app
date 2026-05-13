import { NextResponse } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "APP_PASSWORD not configured" },
      { status: 500 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty / malformed body falls through to the password check below
  }

  if (!body.password || body.password !== expected) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const cookieValue = await hashPassword(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return res;
}

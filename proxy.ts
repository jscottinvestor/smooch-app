import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/signup", "/auth"];

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new NextResponse("Supabase env vars not configured", { status: 500 });
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser also refreshes the access token if needed.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)
  );

  if (!user && !isPublic) {
    const incomingCookieNames = req.cookies
      .getAll()
      .map((c) => c.name)
      .filter((n) => n.startsWith("sb-"))
      .join(",");
    console.log(
      `[proxy] no-user redirect to /login. path=${pathname} sb-cookies=${incomingCookieNames || "(none)"} getUser-error=${userError?.message ?? ""}`
    );
    const redirect = new URL("/login", req.url);
    if (pathname !== "/") redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // Already signed in — bounce off the auth pages.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/|favicon|.*\\..*).*)"],
};

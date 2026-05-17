import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Handles OAuth (Google) and email-verification redirects from Supabase.
 *
 * Both flows arrive here with `?code=...`. We exchange the code for a
 * session, set the auth cookies onto the redirect response itself (not via
 * next/headers cookies()), then redirect to `?next=` (default /dashboard).
 *
 * Setting cookies on a fresh NextResponse.redirect is critical: if we use
 * cookies() from next/headers inside a route handler that returns its own
 * NextResponse, the cookies don't propagate onto that response and the
 * user lands logged-out — which causes a "log in twice" loop.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return new NextResponse("Supabase env vars not configured", { status: 500 });
  }

  // Pre-allocate the redirect response so we can attach Set-Cookie headers
  // onto IT (Supabase calls setAll while exchangeCodeForSession runs).
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.headers
          .get("cookie")
          ?.split(";")
          .map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          })
          .filter((c) => c.name) ?? [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return response;
}

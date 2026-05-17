import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Handles OAuth (Google) and email-verification redirects from Supabase.
 * Both flows arrive with `?code=...`, which we exchange for a session.
 *
 * Cookie-setting belt-and-suspenders: we write session cookies BOTH via
 * Next's cookies() store AND directly onto the redirect response. Some
 * Next.js + Edge runtime combinations don't propagate cookies() writes
 * onto a manually-constructed NextResponse.redirect; setting them on the
 * response too guarantees the browser gets them either way.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const errorDescription = searchParams.get("error_description");

  console.log(
    `[auth-callback] start code=${!!code} next=${next} error=${errorDescription ?? ""}`
  );

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

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${origin}${next}`);

  console.log(
    `[auth-callback] incoming cookies: ${cookieStore
      .getAll()
      .map((c) => c.name)
      .join(",")}`
  );

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          // Write to next/headers store (whichever Next behavior wins)
          try {
            cookieStore.set(name, value, options);
          } catch (e) {
            console.error(`[auth-callback] cookieStore.set failed for ${name}`, e);
          }
          // Write to the redirect response directly (guarantees delivery)
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(`[auth-callback] exchangeCodeForSession failed: ${error.message}`);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const setCookieNames = response.cookies
    .getAll()
    .map((c) => c.name)
    .join(",");
  console.log(`[auth-callback] success. Set cookies: ${setCookieNames}`);

  return response;
}

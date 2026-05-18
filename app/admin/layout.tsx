import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { getServerSupabase } from "@/lib/supabase/server";

// Mirrors the unlimited-tier allowlist in lib/limits.ts. Add an email
// here to grant access to the admin dashboard.
export const ADMIN_EMAILS = new Set<string>(["j@jscott.com"]);

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.has(email)) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to dashboard
        </Link>
        <h1
          className="font-display text-3xl tracking-tight mt-2"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Admin
        </h1>
      </div>
      <AdminTabs />
      <main>{children}</main>
    </div>
  );
}

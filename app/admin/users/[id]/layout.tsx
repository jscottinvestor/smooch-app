import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UserDetailTabs } from "@/components/admin/user-detail-tabs";
import { getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UserDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const service = getServiceSupabase();
  const { data, error } = await service.auth.admin.getUserById(id);
  if (error || !data?.user) {
    notFound();
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/admin/users"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to users
        </Link>
        <h2 className="text-xl font-semibold mt-1">
          {name || data.user.email || "(no email)"}
        </h2>
        {name && data.user.email && (
          <p className="text-xs text-muted-foreground">{data.user.email}</p>
        )}
      </div>
      <UserDetailTabs userId={id} />
      <div>{children}</div>
    </div>
  );
}

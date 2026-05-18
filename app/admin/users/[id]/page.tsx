import { redirect } from "next/navigation";

export default async function UserDetailIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/users/${id}/recipes`);
}

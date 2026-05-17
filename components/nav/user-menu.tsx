"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/browser";

interface UserMenuProps {
  email: string | null;
}

export function UserMenu({ email }: UserMenuProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await getBrowserSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {email && (
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {email}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={signOut}
        disabled={busy}
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}

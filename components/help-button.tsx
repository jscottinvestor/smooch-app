import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HelpButton() {
  return (
    <Link href="/help">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <PlayCircle className="w-3.5 h-3.5" />
        Watch the tour
      </Button>
    </Link>
  );
}

import {
  Camera,
  Cookie,
  PackageOpen,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function HomePage() {
  // Already signed in? Skip the marketing page and go straight to the app.
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-col flex-1 w-full">
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4 flex items-center justify-between">
        <h1
          className="font-display text-xl sm:text-2xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          COTTAGE BAKING BUDDY
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      </header>

      <section className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6">
        <div className="py-12 sm:py-20 max-w-3xl">
          <h2
            className="font-display text-4xl sm:text-6xl tracking-tight leading-[1.1]"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            Run your home baking business{" "}
            <span className="text-emerald-700">without the spreadsheets.</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Track ingredients, cost out recipes, scan receipts with your phone,
            and generate shopping lists — all in one quiet little app made for
            people who bake from home.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">
                <Sparkles className="w-4 h-4" />
                Get started — it's free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature
            icon={Wallet}
            tint="bg-emerald-100 text-emerald-700"
            title="Know exactly what each product costs"
            body="Link every recipe ingredient to a product in your pantry and the app does the math: cost per batch, cost per cookie, and your margin on every tray. Price with confidence instead of guessing."
          />
          <Feature
            icon={PackageOpen}
            tint="bg-amber-100 text-amber-700"
            title="Inventory that monitors itself"
            body="Stock goes up automatically when you scan a receipt. Out-of-stock and low-stock items get flagged with a color so you can never run out mid-bake. No more spreadsheets."
          />
          <Feature
            icon={ShoppingCart}
            tint="bg-sky-100 text-sky-700"
            title="One-tap shopping lists"
            body="Tell the app how many batches of each recipe you're baking. It works out exactly which packages to buy — minus what's already on hand — and groups the list by store. Email it to yourself with one tap."
          />
          <Feature
            icon={Camera}
            tint="bg-rose-100 text-rose-700"
            title="Recipes & receipts from your phone camera"
            body="Snap a photo of any new recipe and Claude AI types it in for you. Same with grocery receipts — every line item gets matched to your inventory automatically. Zero data entry."
          />
          <Feature
            icon={TrendingUp}
            tint="bg-violet-100 text-violet-700"
            title="Watch ingredient prices over time"
            body="Every receipt records the price you paid for each item. Tap any product to see the full history — so you'll spot when sugar's up 30% and can revisit your pricing before it eats your margin."
          />
          <Feature
            icon={Sparkles}
            tint="bg-orange-100 text-orange-700"
            title="Smart, and getting smarter"
            body="Rename a store once and the app remembers — every old spelling on future receipts auto-matches. Each correction you make trains the system. The longer you use it, the less typing you do."
          />
        </div>
      </section>

      <footer className="w-full border-t mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Cottage Baking Buddy</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  tint,
  title,
  body,
}: {
  icon: LucideIcon;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm shadow-foreground/[0.03]">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${tint}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h3
        className="font-display text-xl mb-1.5"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
      >
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}


import {
  Camera,
  ChefHat,
  Cookie,
  Receipt,
  ShoppingCart,
  Sparkles,
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

        <div className="pb-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feature
            icon={ChefHat}
            tint="bg-rose-100 text-rose-700"
            title="Recipes that cost themselves"
            body="Add a recipe, link each ingredient to a product, and instantly see cost per batch, cost per cookie, and how many batches your current inventory can make."
          />
          <Feature
            icon={Cookie}
            tint="bg-amber-100 text-amber-700"
            title="Ingredients in one place"
            body="Per-product package sizes, prices, stock levels, conversion factors, and per-store organization. Color-tinted by category for at-a-glance scanning."
          />
          <Feature
            icon={Receipt}
            tint="bg-sky-100 text-sky-700"
            title="Snap a receipt, done"
            body="Photograph a Costco run from your phone. Claude reads the items, matches them to your inventory, updates prices and stock — you just confirm."
          />
          <Feature
            icon={ShoppingCart}
            tint="bg-emerald-100 text-emerald-700"
            title="Shopping lists, by store"
            body="Pick the recipes you're making. Get a list of exactly what to buy — split per store, with stock you already have subtracted. Email it to yourself in one tap."
          />
        </div>

        <div className="pb-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <Tile
            icon={Camera}
            title="Phone-first"
            body="Take a photo of a new recipe or a receipt right from your phone. Designed for the kitchen counter, not just the desk."
          />
          <Tile
            icon={Wallet}
            title="Know your margins"
            body="See the cost of every cookie before you price a tray. Watch the math change as ingredient prices shift over time."
          />
          <Tile
            icon={Sparkles}
            title="Learns as you go"
            body="Rename a store once and the app remembers. Old receipt spellings auto-match. Less typing, fewer duplicates."
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

function Tile({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium">{title}</span>
      </div>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

import {
  AlertTriangle,
  Camera,
  ChefHat,
  Cookie,
  PackageOpen,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

/**
 * Edit this array to plug in your video URLs.
 *
 * For each video, pick ONE of:
 *  - `{ kind: "youtube", id: "VIDEO_ID" }`
 *      where VIDEO_ID is the 11-char string after `?v=` in the YouTube URL
 *      (e.g., from https://youtu.be/dQw4w9WgXcQ → "dQw4w9WgXcQ")
 *  - `{ kind: "url", url: "https://..." }`
 *      for a direct .mp4/.webm link (e.g., a Supabase Storage public URL)
 *  - `{ kind: "pending" }`
 *      shows a friendly "video coming soon" placeholder
 */
const VIDEOS: VideoEntry[] = [
  {
    tab: "Dashboard",
    icon: Cookie,
    tint: "bg-emerald-100 text-emerald-700",
    title: "Tour of the Dashboard",
    description:
      "The home base. See inventory value at a glance, jump into recipes, spot what's out of stock, and review cost-per-item for every recipe in one table.",
    source: { kind: "pending" },
  },
  {
    tab: "Recipes",
    icon: ChefHat,
    tint: "bg-rose-100 text-rose-700",
    title: "Building and pricing recipes",
    description:
      "How to add a recipe (by hand or by phone-camera photo), link ingredients to inventory products, and use the auto-match button to fill in the rest.",
    source: { kind: "pending" },
  },
  {
    tab: "Ingredients",
    icon: PackageOpen,
    tint: "bg-amber-100 text-amber-700",
    title: "Managing your ingredients & stores",
    description:
      "Add products, set package sizes and conversions, organize them by category, and use Manage Stores to keep store names tidy.",
    source: { kind: "pending" },
  },
  {
    tab: "Receipts",
    icon: Camera,
    tint: "bg-sky-100 text-sky-700",
    title: "Scanning a grocery receipt",
    description:
      "Snap a receipt with your phone, review what Claude pulled off it, and apply — prices update, stock goes up, new items get added to your inventory automatically.",
    source: { kind: "pending" },
  },
];

type VideoSource =
  | { kind: "youtube"; id: string }
  | { kind: "url"; url: string }
  | { kind: "pending" };

interface VideoEntry {
  tab: string;
  icon: LucideIcon;
  tint: string;
  title: string;
  description: string;
  source: VideoSource;
}

export default function HelpVideosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2
          className="font-display text-3xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          Watch the tour
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Short walkthroughs of each tab. Watch all four for the full picture,
          or skip to whatever you're stuck on.
        </p>
      </div>

      <div className="space-y-6">
        {VIDEOS.map((v) => (
          <VideoCard key={v.tab} entry={v} />
        ))}
      </div>

      <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
        Still stuck after watching? Tap{" "}
        <span className="font-medium text-foreground">Ask a question</span> at
        the bottom of any page, or send a note via{" "}
        <span className="font-medium text-foreground">Provide Feedback</span>.
      </div>
    </div>
  );
}

function VideoCard({ entry }: { entry: VideoEntry }) {
  const { icon: Icon, tint, tab, title, description, source } = entry;
  return (
    <section className="rounded-lg border bg-card shadow-sm shadow-foreground/[0.03] overflow-hidden">
      <header className="flex items-center gap-3 px-5 pt-5">
        <span
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tint}`}
        >
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {tab}
          </div>
          <h3
            className="font-display text-xl tracking-tight"
            style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
          >
            {title}
          </h3>
        </div>
      </header>

      <p className="text-sm text-muted-foreground px-5 mt-2">{description}</p>

      <div className="px-5 py-4">
        <VideoPlayer source={source} title={title} />
      </div>
    </section>
  );
}

function VideoPlayer({
  source,
  title,
}: {
  source: VideoSource;
  title: string;
}) {
  if (source.kind === "pending") {
    return (
      <div className="aspect-video w-full rounded-md border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-2 text-muted-foreground p-6 text-center">
        <PlayCircle className="w-8 h-8 opacity-60" />
        <div className="text-sm font-medium">Video coming soon</div>
        <div className="text-xs">
          Once it's uploaded, it'll show up here.
        </div>
      </div>
    );
  }

  if (source.kind === "youtube") {
    return (
      <iframe
        title={title}
        src={`https://www.youtube-nocookie.com/embed/${source.id}?rel=0`}
        className="aspect-video w-full rounded-md border bg-black"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  // Direct URL (Supabase Storage public URL, Vercel Blob, etc.)
  return (
    <video
      controls
      preload="metadata"
      src={source.url}
      className="aspect-video w-full rounded-md border bg-black"
    >
      Your browser doesn't support embedded video. Download it{" "}
      <a href={source.url} className="underline">
        here
      </a>
      .
    </video>
  );
}

// Currently-unused — kept here so the linter doesn't flag the AlertTriangle
// import if a future "this video failed to load" state needs it.
void AlertTriangle;

# Starting Claude Code

Save this file alongside `SPEC.md` and `prototype.html` in an empty folder (or your existing git repo). Open a terminal in that folder and run:

```bash
claude
```

Then paste this as your **first message**:

---

I'm building a personal web app for my wife's home cookie-baking business. I have a working single-file HTML prototype that captures the intended behavior, plus a specification document.

**Your task: read both files, then propose a concrete plan before writing any code.**

Files in this directory:
- `SPEC.md` — the specification (architecture, data model, UI, behaviors)
- `prototype.html` — the working prototype (~3000 lines vanilla JS). When the spec is ambiguous, this is the source of truth.

Stack decisions made:
- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres) for data + cloud sync
- Vercel for hosting
- Anthropic API (Claude) for receipt OCR and product matching
- **Build it as a plain web app first.** PWA upgrade (manifest, service worker, install prompt) comes as the final phase, after everything else is stable. Don't introduce service workers during active development — they make caching debug hellish.

Please:

1. Read `SPEC.md` end-to-end
2. Skim `prototype.html` to understand the UX (use grep/view; don't try to read every line — the structure is: ~150 lines of CSS, then `<script>` with the rest. The functions are well-named and roughly grouped by responsibility.)
3. Propose a plan with:
   - **Phases** I should ship in order (e.g., Phase 1: scaffolding + Inventory tab; Phase 2: Recipes; Phase 3: Receipts)
   - **What you'll do in this session** vs what's left for later
   - **Open questions** you need me to answer before starting
   - **Risks** you can already see

Don't start coding until I've reviewed the plan and given the go-ahead.

---

## Tips for working with Claude Code on this project

- **Reference the prototype often.** When Claude Code asks "how should X behave?", point it to the prototype: "look at how `renderRecipeCard` handles this around line 1400." The prototype is your design doc.

- **One feature at a time.** This is a big port. Resist the urge to ask for "everything." Get the inventory tab solid before touching recipes; get recipes solid before touching receipts.

- **Test on your phone early.** Don't wait until the end. Deploy to Vercel preview environments and test on your wife's actual phone after each phase. Mobile issues compound — fixing them as you go is much cheaper.

- **For the receipt OCR phase specifically:** start by hardcoding the sample receipt parsing (the prototype's `loadSampleReceipt`). Get the whole review-and-apply UI working with that. THEN swap in the actual Anthropic API call. Don't try to do both at once.

- **Keep the prototype around.** When you discover a bug or unintended behavior in the new version, the prototype is your "this is what it should do" reference.

## What's in this handoff

| File | Purpose |
|---|---|
| `SPEC.md` | The full spec — architecture, data model, behaviors, seed data |
| `prototype.html` | The working prototype — copy-paste it as `cookie_business_app.html` |
| `KNOWN_LIMITATIONS.md` | What's deliberately fake in the prototype that needs real impl |
| `STARTER_PROMPT.md` | This file |

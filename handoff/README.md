# Cookie Business App — Claude Code Handoff

This folder contains everything Claude Code needs to build the production version of the cookie-baking-business app.

## Files

| File | What it is |
|---|---|
| `STARTER_PROMPT.md` | Step-by-step instructions for kicking off the Claude Code session. **Start here.** |
| `SPEC.md` | The full specification — architecture, data model, UI, behaviors, seed data |
| `KNOWN_LIMITATIONS.md` | What's deliberately fake in the prototype, and what should NOT be "fixed" |
| `prototype.html` | The working HTML prototype (~3000 lines). Reference for UX and behavior. |

## Quick start

1. Make sure you have Claude Code installed: `npm install -g @anthropic-ai/claude-code` (or whatever the current install command is — check docs.claude.com)
2. Make sure you have Node.js 18+ and a GitHub repo cloned locally
3. Copy these four files into your repo (anywhere; root or a `/handoff` folder)
4. `cd` into your repo and run `claude` to start Claude Code
5. Follow the instructions in `STARTER_PROMPT.md`

## Before you start coding

Make sure you have these set up (Claude Code can help if needed):

- **Supabase project**: create one at supabase.com (free tier is fine). Save the project URL and anon key — you'll need them as env vars.
- **Vercel account**: sign up at vercel.com if you don't have one. Free Hobby plan covers personal use.
- **Anthropic API key**: get one at console.anthropic.com. You'll need this for OCR and matching.
- **A photo of an actual receipt** from a store your wife buys at (Publix, Costco, wherever). Useful for testing the real OCR path beyond the bundled sample.

## Recommended phasing

Don't try to build everything at once. Suggested order:

1. **Scaffolding** — Next.js project, Tailwind, shadcn/ui, Supabase connected, tabs/routing skeleton, deployed-to-Vercel from day one. **Plain web app**, no PWA yet.
2. **Inventory tab + seed data** — get the full CRUD working, including categories. Stop and use it for a few days.
3. **Recipes tab** — port the recipe card, dropdowns, batch multiplier, stock checking. Two seed recipes auto-load.
4. **Receipts (sample-only)** — the review UI working with the bundled sample receipt. Apply persists. No real OCR yet.
5. **Receipts (real OCR)** — replace sample-only with image upload + Claude API call
6. **Polish** — password gate, mobile-specific styling, any rough edges from real use
7. **PWA upgrade** — manifest, service worker, install prompt, offline shell. Do this LAST. See note below.

Each phase should ship to Vercel. Test it on your wife's actual phone before moving on — even without PWA, your wife can open the Vercel URL on her phone and use the app. The only thing missing pre-PWA is the home-screen icon and fullscreen feel.

### Why PWA last
A PWA is a regular web app plus three small files (manifest.json, sw.js, some `<link>` tags). Adding them late costs you maybe a day. Adding them early costs you weeks of confused-by-cached-service-worker debugging during active development. Wait until the app is stable.

## Cost expectations

- Vercel free tier: $0
- Supabase free tier: $0 (handles many MB of personal data easily)
- Anthropic API for receipt OCR: pennies per receipt — even at 100 receipts/month with images, well under $5/month
- Domain (optional): ~$12/year if you want a real domain instead of `cookies.vercel.app`

Total: realistically $0/month for personal use.

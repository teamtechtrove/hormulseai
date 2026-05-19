
# Hormulse AI — Premium landing + real freemium system

This is a large build. Splitting into 3 shippable phases so each can be reviewed before the next. Phase 1 first; confirm and I'll continue.

## Phase 1 — Cinematic landing page (frontend only)

Rebuild `src/pages/Index.tsx` as an enterprise-grade marketing site, inspired by ChatGPT / Claude / Perplexity landings. No fake demos, no placeholder logos.

Sections:
- Sticky glass nav with logo, Pricing / About / Sign in / Get started
- Hero: animated gradient headline, BDT-first positioning ("AI that costs less than your lunch"), dual CTA, trust strip
- Live model strip — real providers we ship (Gemini, Claude, DeepSeek, Groq, GPT) as monochrome wordmarks with "Routed automatically" tagline
- Feature grid (6 cards): Multi-model chat, Image understanding, Daily wellness plan, Tracking, Bangla-aware, Private by default
- "Why Hormulse" comparison table: ChatGPT Plus ৳2,400 vs Hormulse Pro ৳199 — % of junior dev salary
- Pricing section (4 tiers with real limits from spec):
  - Free — ৳0 — 15 msgs/day, Groq only, no uploads, no saved history
  - Lite — ৳99/mo — 100 msgs/day, DeepSeek+Groq, uploads, history
  - Pro — ৳199/mo — unlimited, all models, image gen, priority — "Most popular"
  - Pro+ — ৳399/mo — everything + early access, Claude Opus, longer context
- "How payment works" 3-step (bKash send → screenshot → instant activation within 24h)
- FAQ (real questions: refunds, bKash, data privacy, model choice)
- Footer with credit: "Built by Arman Rafi — portfolio link"

Design language: dark default, deep navy + teal/violet gradients, soft glow shadows, Inter/Space Grotesk pairing via existing tokens, motion via Tailwind + small framer-motion entrances.

## Phase 2 — Real plan tiers + enforcement (backend)

Database migration:
- `subscription_plans` enum: `free | lite | pro | pro_plus`
- `user_subscriptions` table: user_id, plan, status (`active|pending|expired`), started_at, expires_at, payment_ref
- `usage_counters` table: user_id, date, message_count
- `has_plan(user_id, plan)` security-definer function
- RLS: users read own, admins manage all

`supabase/functions/chat/index.ts` enforcement:
- Resolve caller's active plan
- Per-plan daily message cap (15 / 100 / ∞ / ∞)
- Block file/image uploads unless plan ≥ lite
- Block model selection: free → Groq only; lite → DeepSeek+Groq; pro/pro+ → all
- Return structured 402-style payload `{error:"limit_reached", remaining:0, upgradeUrl:"/pricing"}` so the UI can show the friction prompt
- Skip history save for free tier (matches spec "cannot save chat history")

Chat UI:
- Live "X / 15 messages today" pill for free users; turns amber at 10, red at 14
- Upgrade modal on limit-hit and on attempted upload/history-save while free

## Phase 3 — bKash manual activation (Phase 1 of spec)

- `/pricing` route + `/checkout/:plan` route
- Checkout page shows: bKash merchant number, exact BDT amount, reference code (= user id prefix), upload screenshot field → `uploads` bucket
- `payment_requests` table: user_id, plan, amount, trx_id, screenshot_path, status (`pending|approved|rejected`), reviewed_by, reviewed_at
- Admin page `/admin` gets a "Payment requests" tab to approve → writes `user_subscriptions` with 30-day expiry
- Email/in-app notification on approval via existing `user_notifications` table
- Phase 2 (SSLCommerz) left as a clearly-marked TODO edge function stub — not wired until you have merchant credentials

## Out of scope (call out now)
- SSLCommerz live integration (needs your merchant API keys)
- Recurring billing (Moneybag/PortWallet) — Phase 3 of spec, later
- Bangla model fine-tuning — research track, not code
- Referral program — separate build

## Suggested order
1. Ship Phase 1 (landing) — visible win, ~1 turn
2. Ship Phase 2 (enforcement) — makes the freemium real
3. Ship Phase 3 (bKash manual) — unlocks first revenue

Reply "go phase 1" (or all three) and I'll start. If you want any tier price/limit changed before I build, tell me now.

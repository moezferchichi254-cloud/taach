# Backend

Supabase: Postgres + row level security, phone sign-in, storage, realtime,
Edge Functions, pg_cron. Code in `supabase/`, setup steps in
`supabase/README.md`. The app (`mobile/src/data/index.ts`) uses the real
backend when `mobile/.env.local` has the project URL and anon key, and the
in-memory demo otherwise.

## Status

| part | status | notes |
| --- | --- | --- |
| database | built, tested | 31 tables, RLS everywhere; 67 + 22 checks on Postgres 16 (`bash supabase/tests/run.sh`) |
| auth | built, not run live | phone OTP via Supabase; needs an SMS provider that reaches +216. Apple / Google sign-in: not yet |
| orders & money | built, tested | quote, place_order (COD), cancel, ship, courier updates, confirm, claims, ledger, payouts |
| offers & bundles | built, tested | 40% floor, counter-offers, offer price at checkout, bundle discount tiers |
| chat | built, tested | off-app contact flagged in the database, realtime updates to the app |
| files | built, tested | 3 buckets; you can only write into your own folder; ID cards readable by admins only |
| jobs | built, tested | expire offers, cancel late orders (+ automatic 1-star), auto-complete after 2 days, automatic reviews |
| push | built, not run live | `send-push` Edge Function + database webhook; Expo push tokens saved at sign-in |
| courier | partial | signed, idempotent webhook with a generic adapter; no courier contract yet; pickups booked by hand |
| online payments | not started | Konnect / Flouci need your merchant account |
| admin web app | not started | admin actions exist as database functions (see supabase/README.md) |
| email | not used | phone-first; add Resend later for receipts |

Never run against a live Supabase project from here: the app's Supabase
mode was checked by type-checking, a build, and a start-up test against an
unreachable server (sign-in screen shows, clean error, no crash).

## Security checklist

- [x] secrets only in env vars; `.env*` ignored by git; service-role key only in Edge Functions (0 occurrences in the app)
- [x] input validated on the server: every money / order action is a database function that checks the caller and the inputs; CHECK constraints on every amount and status
- [x] authorisation on every read and write, tested with a second and third user (orders, offers, chat, ledger, ID docs, phone numbers)
- [ ] rate limits on sign-in: set Supabase Auth's SMS rate limits and turn on CAPTCHA (dashboard) before launch
- [x] webhooks verify signatures (HMAC-SHA256, constant time) and are processed once (`webhook_events`)
- [x] uploads: 5 MB limit, images only, per-user folders
- [x] no user data in URLs or logs (ids only)
- [~] dependencies audited: `npm audit --omit=dev` shows 5 moderate issues, all in Expo's build tooling (glob / minimatch), not shipped in the app; the suggested fix downgrades Expo, so wait for an Expo patch
- [ ] privacy policy listing every processor: Supabase (EU hosting), the SMS provider, Expo push, the courier, later Konnect / Flouci. Tunisian law (INPDP): declare the processing and check rules on hosting data abroad

## Before launch

1. Tunisian company and lawyer review: holding buyers' money (COD cash, payouts) and the INPDP declaration.
2. SMS provider tested on Tunisian numbers.
3. A courier contract with an API, then its adapter in `courier-webhook` and a `book-pickup` function.
4. Real fees and shipping prices in `public.buyer_fee` / `public.shipping_price` and `mobile/src/lib/pricing.ts` (they must match).

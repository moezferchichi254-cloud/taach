# Architecture: Taach (a rebuild of Vinted's core marketplace features)

Market: second-hand and vintage articles, **Tunisia first**. Mobile app (iOS +
Android). Interface in French and English; Arabic later, so the layout is built
right-to-left-ready from day one. Brand direction: **black-led palette**
(handled in `/replica-design`). Working name "Taach" comes from the repo; the
final name is checked in `/replica-brand`.

Reads `recon.md` and `features.csv`. SQL: `schema.sql` (tested, see the end).

## What changes because it is Tunisia

| Vinted (Europe) | Taach (Tunisia) | why |
| --- | --- | --- |
| Card payment, money held by Vinted | **Cash on delivery first**, online (Konnect / Flouci) second | over 80% of Tunisian online orders are COD ([trade.gov](https://trade.gov/country-commercial-guides/tunisia-ecommerce)); Stripe does not serve Tunisian businesses |
| Drop-off at pickup points / lockers | **Courier collects from the seller** and delivers to the buyer's door | no Mondial-Relay-style relay network; this is how local couriers work |
| Automated payouts | **Payout requests paid by bank transfer (RIB), D17 or Flouci** by an admin, at first | no Stripe Connect; keep it manual until volume justifies an API |
| ID check by payment provider | **CIN photo reviewed by an admin** | same reason |
| EUR, cents | **TND, millimes** (3 decimals) | all money is integer millimes |
| Email login | **Phone number + SMS code** first, Apple / Google too | phone-first market; Apple sign-in is required on iOS if Google is offered |
| | **Hand delivery** option (meet and confirm in app) | common locally |

The money flow for a COD order:

```
buyer orders  ->  seller gets "ship it" + courier pickup booked
courier collects parcel from seller  ->  delivers, collects cash (total) from buyer
buyer has 2 days: "Everything is OK" or "I have a problem"
order completes  ->  seller ledger entry: PENDING
courier transfers the cash to Taach (weekly)  ->  admin reconciles  ->  entry AVAILABLE
seller requests a payout  ->  admin pays by RIB / D17 / Flouci  ->  payout PAID
```

The buyer fee (your "buyer protection" fee) and the shipping price stay with
Taach; the seller gets the item price (minus any bundle discount).

## Stack

| layer | choice | why |
| --- | --- | --- |
| mobile | **Expo (React Native) + TypeScript + Expo Router** | one codebase for iOS and Android, over-the-air updates, EAS builds without a Mac |
| UI | **NativeWind** (Tailwind for React Native), tokens from replica-design | the black palette lives in one tokens file |
| i18n | **i18next + expo-localization**, `I18nManager` for RTL later | FR + EN now, Arabic without a rewrite |
| database | **Postgres on Supabase** | one database, row level security, realtime, storage and auth in one place |
| access rules | **row level security** (in `schema.sql`) + security definer functions | the app talks to the database directly; anything that moves money runs server side |
| auth | **Supabase Auth**: phone OTP (SMS provider: Twilio, Vonage or a Tunisian SMS gateway), Apple, Google | phone-first; SMS cost per sign-up, so rate-limit |
| server code | **Supabase Edge Functions** (Deno, TypeScript) | checkout, webhooks, courier calls, payouts: anything that needs a secret key |
| jobs | **pg_cron** calling SQL functions / Edge Functions | timers (ship-by, 2-day window, offers expiry, auto-feedback) |
| realtime chat | **Supabase Realtime** on `messages` and `offers` | no separate chat server |
| files | **Supabase Storage**: `item-photos` (public), `claims` and `id-docs` (private) | resized on upload in the app (expo-image-manipulator) to ~1600px |
| search | **Postgres full-text + trigram**, accent-insensitive | enough until ~100k listings; move to Meilisearch / Typesense later |
| payments (online) | **Konnect** or **Flouci** (both authorised by the Central Bank of Tunisia) | card, e-DINAR, wallet; hosted payment page, webhook to confirm |
| payments (COD) | courier collects; **remittance reconciled** in the admin | the market default |
| shipping | **courier adapter** with one real courier first (Aramex has an API; check First Delivery / Intigo / others) + a `manual` adapter | swap couriers without touching the app |
| push | **Expo Notifications** | one API for both platforms |
| email | **Resend** (receipts, admin alerts) | SMS / push matter more here; email is secondary |
| admin | small **Next.js** web app on **Vercel**, Supabase auth, `is_admin` users | moderation, claims, ID checks, COD reconciliation, payouts |
| monitoring | **Sentry** (app + functions) | crashes and errors |
| builds | **EAS Build + EAS Submit** | TestFlight and Play internal testing |

Data location: Supabase hosts in the EU (Frankfurt / Paris region). Tunisian
data protection law (INPDP) can require authorisation for transferring
personal data abroad: check before launch.

## Schema

Tables: **31**. Access rules: **row level security on every table**. Writes
that change orders, payments, shipments, the ledger and payouts are done only by
Edge Functions (service role) or by the security definer functions in
`schema.sql`. Full SQL in `schema.sql`.

| group | tables |
| --- | --- |
| members | profiles, addresses, follows, blocks, push_tokens, id_verifications |
| catalogue | categories (with per-category `attribute_schema`, e.g. era for vintage), brands, sizes, items, item_photos, favourites, saved_searches, bundle_discounts, bumps |
| talk | conversations, messages, offers |
| orders | orders, order_items, payments, shipments, shipment_events, claims, feedback |
| money | ledger_entries, payout_methods, payouts, view `wallet_balances` |
| safety / plumbing | reports, notifications, webhook_events |

Hard constraints the database enforces (tested):
- **An item can be in only one live order**: partial unique index
  `order_items_one_live_order`. Two buyers pressing "Buy" at the same moment:
  one wins, the other gets "item no longer available".
- **Offers at most 40% below the price**, checked against a price snapshot.
- **Order total = items - bundle discount + buyer fee + shipping**, always.
- **One review per side per order**; a real review replaces an automatic one.
- **Seller money is a ledger**; balances are sums, never a number you overwrite.
  An order credits a seller once (`unique (order_id, kind)`).
- Sellers cannot mark their own items sold or reserved, verify their own ID,
  or make themselves admin.

## API

Most reads are direct, RLS-protected queries from the app (Supabase client).
The routes below are the ones with rules.

### F01 List an item
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| storage upload `item-photos/{user}/{item}/{n}.jpg` | photo upload | seller | resized JPEG | path |
| insert `items` + `item_photos` (RLS) | create listing | signed in | form fields | item |
| `GET fn/price-hint?category&brand&condition` | similar sold prices (median, range) | signed in | filters | prices or empty |
| update `items` (RLS) | edit, hide, delete | owner | fields | item |

### F02 Find an item
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| rpc `search_items(q, filters, sort, cursor)` | full-text + filters, bumped first | anyone | query, filters | page of items |
| select `items` feed (RLS) | home feed, newest / followed sellers | anyone | cursor | items |
| insert/delete `favourites` (RLS) | favourite | signed in | item_id | |
| insert `saved_searches` (RLS) | save search with alerts | signed in | query, filters | |

### F03 Buy now / F05 bundle
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| `POST fn/quote` | price breakdown: items, bundle discount, buyer fee, shipping by governorate and parcel size | signed in | item_ids, address_id, delivery_method | breakdown |
| `POST fn/checkout` | lock items (order_items), create order; COD: status confirmed; online: create Konnect/Flouci payment, return payment URL | buyer | item_ids, offer_id?, address_id, delivery_method, payment_method | order, payment_url? |
| `POST fn/cancel-order` | cancel before shipping, unlock items | buyer or seller | order_id, reason | order |

### F04 Offers
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| rpc `make_offer(item_ids, amount, parent?)` | offer or counter-offer, posts a chat card | participant | | offer |
| rpc `respond_offer(offer_id, accept)` | accept / decline | the other side | | offer |

### F06 Ship
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| `POST fn/book-pickup` | book courier pickup at the seller's address, get tracking number / label | seller | order_id, pickup address | shipment |
| `POST fn/mark-handed-over` | hand delivery: both sides confirm in person (code shown on buyer's phone) | seller | order_id, code | order |

### F07 / F08 Receive, complete, claim
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| rpc `confirm_received(order_id)` | complete order, credit seller ledger | buyer | | order |
| `POST fn/open-claim` | open claim with photos, freeze the order | buyer, within 2 days of delivery | order_id, reason, text, photos | claim |
| `POST fn/claim-respond` | seller answers / accepts return | seller | claim_id, text | claim |
| rpc `leave_feedback(order_id, stars, text)` | review | either side, after completion | | feedback |

### F09 Get paid
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| insert `id_verifications` (RLS) | upload CIN photos | seller | paths | pending |
| insert `payout_methods` (RLS) | add RIB / D17 / Flouci | seller | details | method |
| `POST fn/request-payout` | move available balance into a payout request | verified seller | amount, method_id | payout |

### F10 Chat & safety
| method path | does | who | input | output |
| --- | --- | --- | --- | --- |
| insert `messages` (RLS) + Realtime subscription | chat | participants, not blocked | text / image | message |
| `POST fn/moderate-message` (DB trigger -> function) | flag phone numbers and "pay outside the app" | system | message | flag |
| insert `reports`, `blocks` (RLS) | report, block | signed in | | |

### Admin (web, `is_admin`)
`/admin/claims`, `/admin/id-checks`, `/admin/reports`, `/admin/cod-remittances`
(upload courier remittance file, match to orders, mark entries available),
`/admin/payouts` (mark paid with bank reference), `/admin/categories`.

### Webhooks in
| from | to | does |
| --- | --- | --- |
| Konnect / Flouci | `fn/webhook-payment` | verify with the provider's verify endpoint (never trust the body), store in `webhook_events`, set payment `succeeded` / `failed`, order `pending` -> `confirmed` or cancelled |
| courier | `fn/webhook-courier` (or polling job if the courier has no webhooks) | shipment events -> order `shipped` / `delivered` (sets `completes_at`) / `refused` |

Webhooks out: none in v1.

### Jobs (pg_cron, times in UTC)
| job | schedule | does |
| --- | --- | --- |
| expire-offers | every 15 min | pending offers past `expires_at` -> expired |
| expire-pending-payments | every 15 min | online orders unpaid after 30 min -> cancelled, items unlocked |
| ship-by | hourly | confirmed orders past `ship_by` -> cancelled, refund if paid online, automatic 1-star feedback for the seller |
| auto-complete | hourly | delivered orders past `completes_at` with no claim -> `complete_order` |
| auto-feedback | daily | completed 4+ days ago with no buyer review -> automatic positive feedback |
| courier-poll | every 30 min | for couriers without webhooks: refresh tracking |
| saved-search-alerts | every 2 h | new matches -> push |
| bump-expiry | hourly | clear `bumped_until` |
| cleanup | daily | orphan photos, drafts older than 30 days |

## The parts that bite

- **Cash on delivery risk.** Buyers refuse parcels (in COD markets this
  happens a lot). Who pays the return shipping? Decide: the buyer fee is
  non-refundable on refusal, and repeat refusers are blocked from COD. The
  seller must not lose money on a refusal.
- **Holding money.** With COD, the courier holds the cash, then Taach does
  until payout. Check with a Tunisian lawyer whether that needs a BCT payment
  licence or can be done as a commercial intermediary (a new BCT circular on
  payment institutions came out in Sept 2026). Online payments go through
  Konnect / Flouci, which are licensed.
- **Company.** The 2000 e-commerce law requires a company based in Tunisia to
  run an e-commerce service. Set it up before taking money.
- **Idempotency.** Payment and courier webhooks arrive twice: `webhook_events`
  primary key plus `unique (provider, provider_ref)` and `unique (order_id, kind)` on the ledger.
- **Races.** Two buyers, one item: the partial unique index. Offer accepted while
  the item is sold: checkout re-checks `status = 'active'` and fails cleanly.
- **Time.** Everything in UTC; deadlines shown in `Africa/Tunis` (no daylight
  saving at the moment, but don't hard-code an offset).
- **Money.** Millimes: 1 TND = 1000. Display with 3 decimals or rounded to
  0.5 / 1 TND in the UI. Never floats.
- **Search.** French and English, accents ("vêtement" = "vetement"):
  `f_unaccent` + `simple` text search + trigram for typos. Arabic search later
  needs its own normalisation.
- **Rate limits.** SMS sign-up codes cost money and get abused: rate-limit per phone
  and per device; captcha on repeated attempts.
- **Uploads.** Up to 20 photos: resize on the phone, upload in parallel, keep a
  draft if the network drops (common on mobile data).
- **Off-platform deals.** Sellers will post phone numbers in chat to skip
  fees. Flag, warn, and make the in-app path better (buyer protection).
- **App store review.** Physical goods may use Konnect / Flouci instead of
  Apple's in-app purchase, but **paid bumps are a digital service and likely
  need in-app purchase**. Keep bumps for later.
- **Deletion.** Account deletion must work in-app (Apple), but orders,
  ledger and payouts are kept (legal / accounting): anonymise the profile.

## Build order

1. **Vertical slice: list → buy (COD) → deliver → complete**, ugly.
   Screens S01 (phone sign-up), S02 feed, S06 item, S10/S11 sell, S18
   checkout (COD, courier `manual` adapter), S21/S22/S23 orders.
   Tables: profiles, addresses, categories, items, item_photos, orders,
   order_items, shipments, ledger_entries. Functions: `fn/quote`,
   `fn/checkout`, `confirm_received`, job auto-complete.
2. **Must-haves, by area:**
   - browse & search: S03, S04, S05, S12, S13, `search_items`, favourites (S09)
   - profile & trust: S07, S08, S25, feedback + auto-feedback
   - chat & offers: S14, S15, S16, Realtime, `make_offer` / `respond_offer`
   - real courier adapter + webhook / polling, refusal flow
   - claims: S24, `fn/open-claim`, admin claims page
   - money: S26, S27, CIN check, payout requests, COD reconciliation admin
   - safety: reports, blocks, message flagging, account deletion
   - push notifications (S29), FR + EN everywhere
3. **Should-haves:** Konnect / Flouci online payment, bundles (S17) + bundle
   discounts, saved searches with alerts (S30), similar items, sort,
   hand delivery, price hint, categories beyond clothes.
4. **Could-haves:** follows, bumps (in-app purchase), pickup points, holiday mode.
5. **Fixes from `/replica-entrepreneur`**, once it has run.

## Schema test

`tests/schema_test.sql`, run on Postgres 16 with `tests/supabase_stub.sql`
standing in for Supabase's `auth` schema. 21 checks, all passing: RLS hides
other users' orders, chats, offers and ledger; sellers cannot fake sold
status or ID checks; the 40% offer floor; one live order per item; order total
check; confirm → completed → seller credited (pending for COD); one review per
side; rating recalculated; anonymous users cannot call functions.

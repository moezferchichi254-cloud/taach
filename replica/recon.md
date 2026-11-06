# Recon map: Vinted (iOS + Android)

Scope: the core C2C marketplace loop: list an item, browse and search, favourite,
message and make offers, buy with buyer protection and tracked shipping, confirm
or claim, review, get paid.
For: a niche marketplace for second-hand and vintage articles in **Tunisia** first
(North Africa later). Languages: French and English (Arabic later).
Tunisia changes payments and shipping: cash on delivery, courier pickup at the
seller's address, TND. See `architecture.md`, "What changes because it is Tunisia".
Project repo: github.com/moezferchichi254-cloud/taach
Design direction (from the user): **black as the primary/brand colour**, not
green/teal. replica-design and replica-brand must use a black-led palette.
Date: 2026-11-06

## How this was gathered, and its limits

- Vinted's own pages (vinted.fr / vinted.co.uk / vinted.com) and the App Store
  page could **not be fetched** from this session (blocked by its network
  settings). Facts below come from web search results that quote Vinted's
  public help centre. Each one is marked with its confidence.
- No screenshots were taken, so `replica/screens/` is empty. Before
  `/replica-design`, add reference screenshots from the public App Store /
  Play listing or from your own account (S-IDs as file names, e.g. `S06.png`).
- **Terms:** third-party sources say Vinted's terms ban unauthorised automation,
  scraping, crawling and bots (unverified, reported as updated Oct 2026). This
  recon used no automation against Vinted. If you click through your own
  account, do it by hand, and read Vinted's current terms for any clause about
  using the service to build a competitor. If there is one, stick to public
  sources.
- Screens and fields marked **guess** are inferred from how the flows have to
  work, not seen in a source. Confirm them by hand in your own account.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | help: uploading step by step | https://www.vinted.com/help/375 | up to 20 photos, category, brand or "No brand", up to 3 materials, similar-sold price hint, parcel size |
| 2 | help: selling basics | https://www.vinted.co.uk/help/26-selling-basics | label, drop-off, order completion |
| 3 | help: pending balance | https://www.vinted.com/help/460 | 2-day buyer window after "delivered", pending -> available, withdraw only completed earnings, ID check, up to 5 business days |
| 4 | help: shipping label not working | https://www.vinted.com/help/154 | QR code or printed label; shipping without a Vinted label -> auto-cancel + negative feedback |
| 5 | help: shipping label issues | https://www.vinted.com/help/1489 | label problems at drop-off |
| 6 | help: buyer protection | https://www.vinted.co.uk/help/550-protection-acheteurs | mandatory fee on every order, % + fixed (~3-8% + £0.30-0.80), now called "Vinted fee" |
| 7 | price list | https://www.vinted.co.uk/pricelist | fee depends on item, order value, single vs bundle |
| 8 | our platform | https://vinted.co.uk/our-platform | checkout = item + shipping + buyer protection + optional services |
| 9 | help: making an offer | https://www.vinted.co.uk/help/10/422 | from item page or chat, max 40% below price, counter-offers, not binding until "Buy now" |
| 10 | help: buying a bundle | https://www.vinted.com/help/260-buying-a-bundle | several items from one seller, negotiable |
| 11 | help: bundle discounts | https://www.vinted.co.uk/help/257 | seller-set discount, standard (non-Pro) sellers only |
| 12 | help: feedback & star ratings | https://www.vinted.com/help/14 | reviews tab on profile, automatic feedback, edit/delete |
| 13 | App Store listing | https://apps.apple.com/us/app/-/id632064380 | not fetched; search snippets: 0% selling fees, prepaid labels, tracking, VoiceOver / Dynamic Type / dark mode |
| 14 | bump guide (3rd party) | https://uk.blog.vendoo.co/what-does-bumped-mean-on-vinted-a-sellers-guide | paid boost 3 or 7 days, from ~£0.95 |
| 15 | buyer protection window (3rd party) | https://closo.co/blogs/platform-specific-guides/vinted-customer-service | protection only on "Buy now" purchases |
| 16 | reseller rules (3rd party) | https://crosslist.com/blog/does-vinted-allow-resellers | bans on bots / scraping / cross-listing tools |

## Core loop

A seller lists a used item for free; a buyer finds it, maybe negotiates, and
pays the item price plus a buyer-protection fee and shipping. The money is held
until the buyer confirms the item arrived as described, then it is released to
the seller. **The buyer fee is what pays for the business** (0% seller fees).

## Screens

Mobile app, bottom tab bar: Home, Search, Sell (+), Inbox, Profile.

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Welcome / sign up / log in | first launch | create an account | social buttons (Apple, Google), email form | filled, error (taken email, wrong password) |
| S02 | Home feed | tab Home | discover new listings | item card grid, category chips, pull to refresh | empty (new user), loading, filled, offline |
| S03 | Catalogue / categories | tab Search | browse by category | category list, search bar | filled |
| S04 | Search results | search or category | find items | item grid, filter chips, sort, save search | empty (no results), loading, filled, infinite scroll |
| S05 | Filter sheet | S04 > filters | narrow results | multi-select lists (size, brand, condition, colour), price range, sort | filled, none selected |
| S06 | Item detail | tap an item card | decide to buy | photo carousel, price + price incl. fee, attributes, description, seller card, Buy now, Make an offer, Message, favourite, similar items | filled, sold, reserved (guess), own item (edit/bump instead of buy) |
| S07 | Member profile / wardrobe | seller card or tab Profile | see a seller's items and trust | avatar, stars, review count, location, follow, listings grid, bundle CTA | own vs other, empty wardrobe |
| S08 | Reviews | S07 > reviews | trust | star summary, review list (member + automatic) | empty, filled |
| S09 | Favourites | Profile > favourites | items you liked | item grid | empty, filled, item sold |
| S10 | Sell: photos | tab Sell | add photos | camera, gallery picker, reorder grid (up to 20), photo tips | empty, 1-20 photos, permission denied |
| S11 | Sell: listing form | after S10 | describe and price | title, description, category, brand, size, condition, colour, materials (max 3), price with similar-sold hint, parcel size, Upload | empty, validation errors, draft |
| S12 | Category picker | S11 > category | pick deepest subcategory | drill-down list, search | filled |
| S13 | Brand picker | S11 > brand | pick brand | type-ahead, "No brand" | no match |
| S14 | Inbox | tab Inbox | all conversations + notifications | conversation list with item thumbnail, unread badge | empty, filled |
| S15 | Conversation | S14 or S06 > Message | negotiate and coordinate | message bubbles, offer cards (accept / decline / counter), order status cards, item header with Buy | empty, filled, offer pending, blocked |
| S16 | Make an offer | S06 or S15 | propose a price | price input, suggested amounts, 40% floor error | valid, too low |
| S17 | Bundle builder | S07 > bundle | buy several items from one seller | selectable wardrobe grid, running total, discount applied | 1 item, n items, discount tier reached |
| S18 | Checkout | Buy now / accepted offer | pay | item summary, address, delivery method (home / pickup point), payment method, breakdown: item + buyer protection fee + shipping, Pay | missing address, payment error, item sold meanwhile |
| S19 | Pickup point map | S18 > pickup point | choose drop-off/collection point | map, list, opening hours | no points nearby, location denied |
| S20 | Order confirmed | after payment | reassure | summary, what happens next, track | filled |
| S21 | Orders list | Profile > my orders | bought and sold orders | segmented control bought / sold, status pills | empty, filled |
| S22 | Order detail (buyer) | S21 or S15 card | follow the order | status timeline, tracking, "Everything is OK", "I have a problem", countdown of 2-day window | paid, shipped, delivered, completed, cancelled, in dispute |
| S23 | Order detail (seller): ship it | S21 sold | send the parcel | shipping deadline, QR code / label download, drop-off instructions, mark as sent (guess) | waiting to ship, label error, late |
| S24 | Report a problem / claim | S22 | get a refund | reason picker (not received, damaged, not as described), photo evidence, description | submitted, seller responded, resolved |
| S25 | Leave feedback | after completion | rate the other side | 1-5 stars, text | before, after, auto feedback shown |
| S26 | Balance / wallet | Profile > balance | see money | pending vs available, history, Withdraw | zero, pending only, available |
| S27 | Payout setup / ID check | S26 > withdraw (first time) | KYC + bank account | identity flow (provider), IBAN form | not verified, pending, verified, rejected |
| S28 | Settings | Profile > settings | manage account | profile edit, addresses, payment methods, bundle discount settings, notifications, holiday mode (guess), delete account | |
| S29 | Notifications | Inbox tab or bell | updates | list: favourites, offers, order updates, price drops (guess) | empty, filled |
| S30 | Saved searches | S04 > save / Profile | alerts on new matches | list, toggle alerts | empty, filled |
| S31 | Bump a listing | S06 own item | paid promotion | duration (3 / 7 days), price, pay | could-have |
| S32 | Report / block | menu on S06, S07, S15 | safety | reason list, confirm | |

## Flows

```
F01 Seller lists an item
    Sell tab -> S10 photos -> S11 form (S12 category, S13 brand) -> Upload -> S06 own item
    happy path clicks: ~12 (+ typing)
    edge: camera permission denied, 0 photos, upload fails on bad network (keep draft),
          category requires 3+ photos, price below minimum, app killed mid-form

F02 Buyer finds an item
    S02 home -> S04 search -> S05 filters -> S04 -> S06
    happy path clicks: 4-6
    edge: no results, filter combo empty, item sold while viewing, slow images

F03 Buyer buys now (core money flow)
    S06 Buy now -> S18 checkout -> S19 pickup point -> pay (3DS) -> S20 confirmed
    happy path clicks: ~5
    edge: item bought by someone else between S06 and pay (lock / reserve), 3DS fails,
          double tap Pay, address outside shipping zone, no pickup points

F04 Buyer makes an offer
    S06 Make an offer -> S16 -> S15 offer card -> seller accepts/counters -> buyer S18 -> pay
    happy path clicks: ~6 across two people
    edge: offer >40% below (blocked), offer on item that sells meanwhile,
          seller counters twice, offer expiry (guess)

F05 Buyer bundles items
    S07 wardrobe -> S17 bundle builder -> (offer) -> S18 -> pay
    edge: one item in the bundle sells meanwhile, bundle over parcel size limits

F06 Seller ships
    push "you sold an item" -> S23 -> QR code / label -> drop off -> tracking updates
    edge: label fails at drop-off point (try another point), shipping deadline missed
          -> auto cancel + refund + negative auto feedback, seller ships without label

F07 Buyer receives and completes
    push "delivered" -> S22 -> "Everything is OK" -> S25 feedback
    edge: buyer does nothing -> auto-complete after 2 days + positive auto feedback after 4

F08 Buyer reports a problem
    S22 "I have a problem" -> S24 reason + photos -> seller responds in S15
    -> return or refund or admin decision
    edge: claim after window (blocked), return shipping, partial refund, admin escalation

F09 Seller gets paid
    order completed -> S26 pending -> available -> S27 ID check + IBAN (first time) -> withdraw
    edge: ID rejected, bank details wrong, withdrawal of pending funds blocked

F10 Members talk
    S06 Message -> S15 chat
    edge: blocked member, off-platform payment requests (flag), images in chat (guess), spam
```

Number to beat: F03 at ~5 taps from item page to paid.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Tab bar | 5 tabs, centre Sell action | active, badge | all |
| Item card | grid (2 col), small (similar items) | default, favourited, sold, bumped | S02 S04 S06 S07 S09 S17 |
| Favourite heart | on card, on item page | off, on, animating | S02 S04 S06 S09 |
| Photo carousel | full-width, zoom | loading, 1..20 | S06 |
| Photo picker grid | reorderable | empty, filled, max reached | S10 |
| Attribute row | tap-to-pick (category, brand, size...) | empty, set, error | S11 |
| Drill-down picker | category tree, list with search | | S12 S13 S05 |
| Bottom sheet | filters, offer, report | open, dragging | S05 S16 S32 |
| Chip | filter, category | selected, unselected, removable | S02 S04 |
| Price field | currency input, with hint | valid, invalid | S11 S16 |
| Price breakdown | item / fee / shipping / total | | S06 S18 |
| Seller card | avatar, stars, count, location | | S06 S07 |
| Star rating | display, input | 0-5, half stars (display) | S07 S08 S25 |
| Message bubble | mine, theirs, system | sent, delivered, failed | S15 |
| Offer card | in chat | pending, accepted, declined, countered, expired | S15 |
| Order status card / timeline | in chat, in order | paid, shipped, delivered, completed, cancelled, disputed | S15 S22 S23 |
| Map + list | pickup points | loading, none, selected | S19 |
| QR code block | shipping code | | S23 |
| Balance tile | pending, available | | S26 |
| Empty state | per screen | | most |
| Toast / snackbar | success, error | | all |
| Primary / secondary / text button | | default, pressed, disabled, loading | all |
| Skeleton loader | grid, list | | S02 S04 S14 |

## Inferred data model

```
User           id, username, email, avatar_url, bio, country, city, created_at,
               rating_avg, rating_count, is_verified, holiday_mode (guess)
               evidence: S07 profile, help 14 (ratings), help 460 (ID check)
               confidence: high (holiday_mode: guess)

Address        id, user_id, name, line1, line2, postcode, city, country, phone
               evidence: S18 checkout      confidence: high

Item           id, seller_id, title, description, category_id, brand_id (nullable = "No brand"),
               size_id, condition (new_with_tags | new_without_tags | very_good | good | satisfactory),
               colour_ids (1-2, guess), material_ids (max 3), price_cents, currency,
               parcel_size (small | medium | large), status (active | reserved | sold | hidden | deleted),
               favourite_count, view_count, bumped_until, created_at
               evidence: help 375 (upload fields), S06      confidence: high (condition values: medium)

ItemPhoto      id, item_id, url, position (0-19)
               evidence: help 375 (up to 20)               confidence: high

Category       id, parent_id, name, size_group_id, min_photos (some categories need 3+)
               evidence: help 375                           confidence: high
Brand          id, name                                     confidence: high
SizeGroup/Size id, group_id, label                          confidence: medium

Favourite      user_id, item_id, created_at                 confidence: high
SavedSearch    id, user_id, query, filters (json), alerts_on   evidence: S30   confidence: medium
Follow         follower_id, followed_id                     confidence: medium

Conversation   id, item_id (nullable), buyer_id, seller_id, last_message_at
Message        id, conversation_id, sender_id (null = system), body, attachments, kind (text | offer | order_event), created_at
               evidence: S15                                confidence: high

Offer          id, conversation_id, item_ids / bundle_id, from_user_id, amount_cents,
               status (pending | accepted | declined | countered | expired), parent_offer_id
               evidence: help 422 (40% floor, counters, non-binding)   confidence: high

Bundle         id, buyer_id, seller_id, item_ids, discount_pct
BundleDiscount seller_id, min_items, pct (tiers)            evidence: help 257   confidence: medium

Order          id, buyer_id, seller_id, item_ids, item_total_cents, buyer_fee_cents,
               shipping_cents, total_cents, currency, offer_id (nullable),
               status (pending_payment | paid | shipped | delivered | completed | cancelled | disputed | refunded),
               ship_by, delivered_at, completes_at (delivered_at + 2 days), payment_intent_id
               evidence: help 460, 154, 550                 confidence: high

Shipment       id, order_id, carrier, service (home | pickup_point), pickup_point_id,
               label_url / qr_code, tracking_number, status, events (json)
               evidence: help 154, 26                       confidence: high

Claim          id, order_id, reason (not_received | damaged | not_as_described | other),
               description, photos, status (open | seller_responded | return_requested | refunded | rejected | escalated)
               evidence: help 550                           confidence: medium

Feedback       id, order_id, from_user_id, to_user_id, stars (1-5), text, is_automatic, created_at
               evidence: help 14                            confidence: high

Wallet         user_id, pending_cents, available_cents (derived from ledger)
LedgerEntry    id, user_id, order_id, kind (sale | refund | withdrawal | fee), amount_cents, status, created_at
Payout         id, user_id, amount_cents, status, bank_last4, requested_at, paid_at
               evidence: help 460 (pending / available, 5 business days)   confidence: high

Report         id, reporter_id, target_type (item | user | message), target_id, reason, status
Block          blocker_id, blocked_id                       confidence: medium
Bump           id, item_id, days (3 | 7), price_cents, starts_at, ends_at   evidence: source 14   confidence: medium
Notification   id, user_id, kind, payload, read_at          confidence: high
```

Relationships: User 1-n Item, Item 1-n ItemPhoto, Item n-1 Category/Brand/Size,
User n-n Item via Favourite, Conversation 1-n Message, Conversation 1-n Offer,
Order n-n Item (bundle), Order 1-1 Shipment, Order 0-1 Claim, Order 0-2 Feedback,
User 1-n LedgerEntry, User 1-n Payout.

Hard constraints: an item can be in at most one paid order (lock it at checkout);
offers >= 60% of price; feedback once per side per order.

## Feature matrix

See `features.csv`. Must: 38 (37 counted by parity: the admin console is an
addition the user never sees), should: 8, could: 7, skip: 6.

## Out of scope (cannot or should not be cloned)

- **Vinted's members and listings.** The network is the moat; a niche has to
  build its own supply first (seed sellers by hand).
- **Its logistics network** (Vinted Go lockers, its own carrier network) and
  **negotiated carrier rates**. Use a multi-carrier API with your own contracts.
- **Pro seller programme**, item authenticity services, community forum.
- **Brand, name, teal colour, copy, icons and photos.** Rebuilt fresh in
  `/replica-design` and `/replica-brand`.

## Size

Screens 32, flows 10, entities ~22. Size: **L (a quarter)** for a small team,
longer solo.

Hard parts:
1. **Holding money between two people.** Marketplace payments with funds held until
   completion, refunds and payouts: Stripe Connect (separate charges and
   transfers), seller KYC, a ledger. Plus EU rules: DAC7 seller reporting,
   and check whether your payment provider's model covers holding funds
   (otherwise a payments licence question).
2. **Shipping.** Labels / QR codes, pickup-point maps and tracking webhooks
   through a multi-carrier API, per country.
3. **Order state machine + disputes.** Timers (ship-by, 2-day window, auto feedback),
   claims with evidence, refunds, and an admin console to decide them.

Also non-trivial: realtime chat with offer cards, image upload and resizing,
search with facets, push notifications on two platforms, moderation (DSA
report flow), and store review.

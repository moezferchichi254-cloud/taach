# Build log

App: `mobile/` (Expo SDK 58, Expo Router, TypeScript). Data: in-memory fake
data layer (`mobile/src/data/fake.ts`) with the same functions as the planned
Supabase API, so `/replica-backend` swaps it without touching screens.
Tested in a browser (web export + Playwright): `mobile/e2e/core-loop.e2e.js`
and `mobile/e2e/screens.e2e.js` (28 checks across every screen), light and
dark, 0 console errors. Screenshots in `replica/clone-screens/`.

| ID | date | status | missing | notes |
| --- | --- | --- | --- | --- |
| shell | 2026-11-06 | done | Inter / Fraunces font files not loaded yet (system fonts) | routes for every S-ID, tab bar, theme from tokens, FR + EN, dark mode |
| design | 2026-11-06 | done | | `/design` page shows every primitive |
| S01 sign in | 2026-11-06 | partial | real SMS OTP, Apple / Google sign-in | phone + 4-digit code, validation errors |
| S02 feed | 2026-11-06 | partial | pull to refresh, infinite scroll, personalisation | 2-column grid, category chips, empty state |
| S06 item | 2026-11-06 | partial | photo zoom, similar items, favourite toggle | layout per screenshot reference; total incl. fee; protection note |
| S10/S11 sell | 2026-11-06 | partial | drag to reorder photos, colours, materials, price hint, draft saving | validation for photos, title, category, condition, price |
| S12/S13 pickers | 2026-11-06 | partial | category tree depth, brand search | one generic picker route |
| S18 checkout | 2026-11-06 | partial | address edit, online payment (Konnect / Flouci) | COD + courier or hand delivery, live quote |
| S21 orders | 2026-11-06 | done | | bought / sold |
| S22/S23 order | 2026-11-06 | partial | claims (S24), feedback (S25), timers | ship → (demo) delivered → confirm → completed, seller credited as pending |
| S07 profile (own) | 2026-11-06 | partial | public profile, wardrobe grid, reviews | balance, language switch, demo account switch |
| S03/S04 search | 2026-11-08 | partial | brand and colour filters, search suggestions | accent-insensitive search, quick chips, result count, save search |
| S05 filters | 2026-11-08 | done | | sort, category, vintage, condition, size, price range, live count |
| S30 saved searches | 2026-11-08 | partial | push alerts (backend job) | list, toggle alerts, delete, reopen |
| S09 favourites | 2026-11-08 | done | | heart on cards and item page, seller notified |
| S14 inbox + S29 notifications | 2026-11-08 | partial | push | unread badge on the tab, pending-offer badge, notifications tab |
| S15 conversation | 2026-11-08 | partial | realtime, images in chat | offer cards, system messages, off-app contact flagged, blocked state |
| S16 offer | 2026-11-08 | done | | 40% floor, suggestions, counter-offers, buy at accepted price |
| S17 bundle | 2026-11-08 | done | | multi-select, discount tiers, bundle checkout, bundle offers |
| S07/S08 member + reviews | 2026-11-08 | partial | follow | wardrobe, reviews incl. automatic, bundle deal, block, report, holiday notice |
| S24 claim | 2026-11-08 | partial | seller response, admin decision, returns | reasons, text, photos; order goes to dispute; money stays on hold |
| S25 feedback | 2026-11-08 | partial | edit / delete own review | stars + comment after completion, rating recalculated |
| S26 wallet | 2026-11-08 | partial | admin payout processing | pending / available, history, withdraw (needs ID + account) |
| S27 ID check | 2026-11-08 | partial | admin review | CIN front + back upload, pending state |
| S28 settings | 2026-11-08 | done | | profile, address with 24 governorates, payout account (RIB / D17 / Flouci), bundle tiers, holiday mode, language, account deletion |
| S32 report | 2026-11-08 | done | | item and member |
| S31 bump | 2026-11-08 | stub | everything | could-have; paid boosts likely need Apple / Google in-app purchase |


Harder than expected:
- `useSyncExternalStore` needs stable snapshots: the store caches each read,
  keyed on the selector's parameters. Forgetting the key showed a stale list.
- With `allowJs`, TypeScript read the web export bundle in `dist/` and
  crashed; `tsconfig.json` now only includes `src/`.
- NativeWind was in the plan; the app uses plain StyleSheet with the
  generated `tokens.ts` instead: fewer moving parts on a brand-new SDK, same
  tokens-only rule.
- `expo install` needs `EXPO_OFFLINE=1` in this sandbox (Expo's API host is
  not reachable); versions come from the SDK's bundled list.

Placeholders to replace before launch: buyer fee (5% + 0.500 TND) and
shipping prices (7 / 8 / 10 TND) in `mobile/src/lib/pricing.ts`.

Found by the screens test (2026-11-08) and fixed:
- the heart overlay on item cards blocked taps on the whole photo (web);
- the Message button sat inside the seller link;
- opening a conversation looped forever (mark-as-read changed the
  conversation, which marked it read again);
- web switches were the platform green: new `Toggle` uses the palette.

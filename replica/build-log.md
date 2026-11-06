# Build log

App: `mobile/` (Expo SDK 58, Expo Router, TypeScript). Data: in-memory fake
data layer (`mobile/src/data/fake.ts`) with the same functions as the planned
Supabase API, so `/replica-backend` swaps it without touching screens.
Tested in a browser (web export + Playwright): `mobile/e2e/core-loop.e2e.js`,
light and dark, 0 console errors. Screenshots in `replica/clone-screens/`.

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
| S03 S08 S09 S14-S17 S19 S20 S24-S32 | 2026-11-06 | stub | everything | placeholder screens |

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

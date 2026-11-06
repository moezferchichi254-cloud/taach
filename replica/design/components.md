# Taach components

Design system for the Expo app. Tokens: `tokens.json`, generated into
`global.css` / `tailwind.tokens.js` / `tokens.ts` by `build_tokens.py`.
Contrast: 46 pairs, light and dark, 0 AA failures (`contrast.py tokens.json`).

## Where this comes from

No reference screenshots were available (`replica/screens/` is empty), so
nothing here is measured from Vinted. The system follows standard mobile
marketplace patterns (2-column photo grid, bottom tab bar, bottom sheets,
chat with structured cards) on a 4px grid. Nothing is taken from Vinted:
not its teal, its logo, icons, illustrations, font or wording.

## Direction

- **Black-led.** Black is the action colour: primary buttons, active tab,
  selected chips, focus rings. In dark mode it flips: white is the action colour.
- **Photos do the colour.** The UI stays monochrome so items stand out.
- **Warm paper surfaces** (`surface #f5f4f2`) and one warm tone, `vintage`,
  used only for the Vintage badge and era tags. That is the niche's signature.
- Status colours (`danger`, `success`, `warning`) only for status: never decoration.

## Global rules

- **Fonts:** Inter for all UI. Fraunces (display serif) only for brand
  moments: onboarding headline, empty-state titles, section headers on the
  home feed. IBM Plex Sans Arabic reserved for the Arabic release. All SIL OFL.
- **Icons:** Lucide (`lucide-react-native`, ISC licence), 24px, 1.75 stroke,
  `text` colour; 20px inside inputs and chips.
- **Touch targets:** at least 44 x 44 (pad small icons with `hitSlop`).
- **Text size:** respect the phone's text-size setting; cap scaling at 1.6x
  (`maxFontSizeMultiplier`) on dense rows such as item cards and tab labels.
- **RTL-ready:** use start/end, never left/right (`ps-4`, `me-2`, `start-0`);
  flip directional icons (back chevron, arrows) when `I18nManager.isRTL`.
  Numbers and prices stay left-to-right inside RTL text.
- **Money:** `formatTND(millimes)`: `35,000 DT` in French, `TND 35.000` in
  English; whole dinars drop the decimals in lists (`35 DT`), full precision
  in checkout. Never floats.
- **Pressed, not hover:** mobile states are default, pressed (`accent-pressed`
  or 0.7 opacity), focused (keyboard / switch control), disabled, loading.
- **Accessibility:** every touchable has `accessibilityRole`, a label, and
  `accessibilityState` (selected, disabled, busy, checked). VoiceOver and
  TalkBack read item cards as one element: "Veste en cuir, 35 dinars,
  taille M, très bon état, vintage".
- **Motion:** 120ms presses, 200ms sheets and toasts, 320ms page transitions.
  Respect "reduce motion": no scale animations, fades only.

## Primitives

```
Button
  variants  primary (bg accent, text on-accent), secondary (bg bg, 1px border text, text text),
            ghost (no bg, text text), danger (bg danger, text on-danger)
  sizes     sm 36, md 44, lg 52 (full width in sticky footers)
  states    default, pressed (accent-pressed), focused (2px focus ring, 2px offset),
            disabled (40% opacity, not pressable), loading (spinner replaces icon, label kept)
  tokens    radius pill, font base/600, padding x 20
  a11y      role button, label = visible text, state busy while loading
  used on   all
```

```
IconButton
  variants  plain, filled (surface circle), on-photo (bg black 45% alpha, white icon)
  sizes     36 visual, 44 hit area
  states    default, pressed, disabled
  a11y      label required ("Ajouter aux favoris", "Retour")
  used on   S06 header, S10, S15, S22
```

```
TextField
  variants  single line, multiline (description, 3000 chars with counter), price (TND, numeric keypad)
  parts     label (sm/600), input, helper or error text (xs), optional leading icon / trailing action
  states    default (border-input), focused (2px accent border), filled, error (danger border + message),
            disabled, read-only
  tokens    height 48, radius md, bg bg, padding x 12
  a11y      label tied to input, error announced, correct keyboard type and autocomplete
  used on   S01, S11, S16, S18, S24, S27, S28
```

```
SearchBar
  parts     search icon, input, clear button, cancel (when focused)
  states    idle, focused, typing (recent + suggestions list), loading
  tokens    bg surface-2, radius pill, height 44
  used on   S02 header, S03, S04
```

```
SelectRow (tap to pick)
  parts     label, current value or placeholder (text-muted), chevron (flips in RTL)
  states    empty, set, error, disabled
  opens     DrillDownPicker or BottomSheet
  used on   S11 (category, brand, size, condition, colour, materials, era, parcel size), S18, S28
```

```
DrillDownPicker
  parts     search field, list of rows, breadcrumb back, "Aucune marque" row for brands
  states    loading, results, no match, selected (check icon)
  used on   S05, S12, S13
```

```
Chip
  variants  filter (opens a sheet), choice (single select), toggle (multi select), removable (x)
  states    unselected (bg surface-2, text text), selected (bg accent, text on-accent),
            pressed, disabled
  tokens    height 36, radius pill, font sm/500
  a11y      role button / checkbox, state selected
  used on   S02 categories, S04 active filters, S05, S11 colours
```

```
Badge
  variants  vintage (bg vintage-bg, text vintage), status success / warning / danger (matching -bg),
            neutral (surface-2), on-photo (black 60% alpha, white)
  tokens    height 22, radius sm, font xs/600, uppercase off
  used on   item cards (Vintage, Réservé, Vendu), S21, S22
```

```
Avatar
  sizes     24, 32, 48, 80
  states    image, initials fallback (surface-2), verified tick (CIN checked)
  used on   S06, S07, S08, S14, S15
```

```
StarRating
  variants  display (read-only, half stars, with count "4,8 (126)"), input (5 large stars, 44 each)
  a11y      display reads "4,8 sur 5, 126 avis"; input is an adjustable control
  used on   S06, S07, S08, S25
```

```
PriceText
  variants  list (price), with fee ("37,450 DT incl. protection" in text-muted xs), struck (original price on offers)
  tokens    type price, tabular numbers
  used on   item cards, S06, S15, S16, S17, S18
```

```
PriceBreakdown
  rows      article(s), remise lot (if any), protection acheteur, livraison, total (lg/700),
            paiement à la livraison / en ligne
  states    loading (skeleton rows), recalculating, error (retry)
  used on   S06 (summary), S18, S20, S22
```

```
Toast
  variants  success, error, info (all bg text, text bg: inverted, black in light mode)
  behaviour bottom, above tab bar, 3s, swipe to dismiss, one at a time, action optional ("Annuler")
  a11y      announced politely
  used on   all
```

```
BottomSheet
  parts     handle, title, content, sticky footer button
  states    open (snap points), dragging, closing
  tokens    radius 16 top, shadow pop, backdrop black 40%
  a11y      focus moves into the sheet, back gesture closes it
  used on   S05 filters, S16 offer, S19, S31, S32, sort, share
```

```
Dialog (confirm)
  for       destructive or money actions: cancel order, delete listing, confirm received, withdraw
  parts     title, one line body, primary + cancel
  used on   S06, S18, S22, S23, S26
```

```
Skeleton
  variants  item card, list row, text line
  behaviour subtle shimmer (none with reduce motion)
  used on   S02, S04, S07, S14, S21
```

```
EmptyState
  parts     line illustration (own artwork, 1 colour, text-muted), title (Fraunces xl), body, one button
  examples  no favourites, no messages, no results, empty wardrobe, no orders, offline
  used on   S02, S04, S09, S14, S21, S26, S29, S30
```

## Composed components

```
ItemCard
  layout    photo 4:5, radius md; favourite IconButton (on-photo) top end;
            Badge row bottom start on photo (Vintage, Réservé, Vendu);
            below: price (PriceText), size + brand (text-muted sm, 1 line), condition (xs)
  states    default, pressed, favourited (filled heart, haptic), sold (photo 60% + Vendu badge),
            reserved, bumped ("Promu" xs label, could-have), loading (Skeleton)
  grid      2 columns, gap 12, screen padding 16
  a11y      one element, label "<title>, <price>, <size>, <condition>[, vintage]", favourite as a separate action
  used on   S02, S04, S06 (similar), S07, S09, S17
```

```
PhotoCarousel
  parts     full width 4:5 photos, page dots, counter "3/12", tap for zoom viewer (pinch)
  states    loading (blur placeholder), error (retry), single photo (no dots)
  a11y      swipe announced "photo 3 sur 12", each photo has alt from title
  used on   S06
```

```
PhotoPickerGrid
  parts     3-column grid of thumbnails, add tile (camera / gallery), drag to reorder,
            first photo marked "Couverture", remove (x), counter "8/20", tips link
  states    empty (big add tile + tips), filling, max reached (add tile hidden),
            uploading (progress ring per photo), failed (retry on photo), permission denied (settings button)
  used on   S10
```

```
SellerCard
  parts     Avatar 48, name, StarRating display, city / gouvernorat, "Vérifié" tick, chevron
  used on   S06, S15 header
```

```
ConversationRow
  parts     Avatar 48, name, last message (1 line, text-muted), item thumbnail, time, unread dot (accent)
  states    read, unread (name sm/700), offer pending (Badge warning), order update
  used on   S14
```

```
MessageBubble
  variants  mine (bg accent, text on-accent, aligned end), theirs (bg surface, text text, aligned start),
            system (centred, xs, text-muted), image
  states    sending (60% opacity), sent, failed (danger icon + "Réessayer"), flagged (warning note under it)
  used on   S15
```

```
OfferCard (in chat)
  parts     item thumbnail(s), original price struck, offer price large, who made it
  actions   other side: Accepter (primary), Contre-offre (secondary), Refuser (ghost);
            buyer after acceptance: Acheter (primary)
  states    pending (expires in Xh), accepted, declined, countered, expired, used
  used on   S15
```

```
OrderStatusTimeline
  steps     Commandé, Expédié, Livré, Terminé (COD: "Payé à la livraison" note on Livré)
  states    current step bold with accent dot, done steps check, problem branch (Refusé, Litige, Annulé in danger)
  extras    tracking number (copy), courier name, countdown "2 jours pour confirmer" on Livré
  used on   S15 (compact card), S22, S23
```

```
GovernorateSelect
  data      24 Tunisian governorates, then délégation, then city
  used on   S01 onboarding, S18 address, S28
```

```
TabBar
  tabs      Accueil, Rechercher, Vendre (centre, filled black circle with +), Messages (badge), Profil
  states    active (icon filled + label text), inactive (text-muted), badge count (danger bg, white, max "9+")
  tokens    height 56 + bottom safe area, bg bg, top border
  used on   all main screens
```

```
StickyFooter
  parts     one primary Button (lg, full width) + optional secondary or price summary
  used on   S06 (Acheter / Faire une offre), S11 (Publier), S17, S18 (Commander), S24
```

## Screen-level patterns

- Headers: 52 high, title lg/600 centred, back chevron start, actions end.
- Lists: rows 64 high, 16 padding, hairline `border` dividers.
- Forms: one column, 16 between fields, sticky footer for the main action.
- Pull to refresh on feeds, infinite scroll with a skeleton row at the end.
- Offline: banner under the header ("Hors ligne : affichage des données enregistrées").

## Next

Build these once in the Expo project, in isolation on a hidden `/design` route,
as the first part of `/replica-build` (the app shell). The HTML preview
(`preview.html`, screenshots in `preview/`) is only a visual check of the
tokens; it is not app code.

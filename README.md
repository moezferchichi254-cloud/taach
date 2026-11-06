# Taach

A mobile marketplace for second-hand and vintage articles, starting in Tunisia.

- `mobile/`: the Expo app (iOS, Android, web for testing)
- `replica/`: research (`recon.md`, `features.csv`), the plan
  (`architecture.md`), the database (`schema.sql`), the design system
  (`design/`), the build log and screenshots

## Run the app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `w` for the browser.
Demo: sign in with any 8-digit number and any 4-digit code. Switch between
the three demo accounts in Profil to play buyer and seller.

## Checks

```bash
cd mobile && npx tsc --noEmit
python3 ../replica/design/build_tokens.py   # after changing replica/design/tokens.json
```

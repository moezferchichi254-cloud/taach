# Taach backend (Supabase)

Everything server side: database, access rules, money logic, files, jobs and
Edge Functions. Tested on Postgres 16: `bash supabase/tests/run.sh`.

| file | what |
| --- | --- |
| `migrations/…001_schema.sql` | 31 tables, row level security on all of them |
| `migrations/…002_marketplace.sql` | orders, offers, chat, search, money, claims, admin actions, scheduled jobs |
| `migrations/…003_storage.sql` | photo buckets and who can read / write them |
| `seed.sql` | categories, sizes, brands |
| `functions/courier-webhook` | courier status updates (signed, processed once) |
| `functions/send-push` | push notifications for new `notifications` rows |
| `functions/delete-account` | in-app account deletion |
| `tests/` | the database tests |

## Set it up (about 30 minutes)

You create the accounts; nothing here signs up for anything.

1. **Create a project** at supabase.com. Region: Frankfurt (closest to
   Tunisia). Free plan is fine to start.
2. **Database.** Install the CLI and link the project:
   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   Then run `seed.sql` in the SQL editor.
3. **Scheduled jobs.** Database > Extensions: enable `pg_cron`, then run the
   last block of `…002_marketplace.sql` again (it schedules the jobs only
   when `pg_cron` is on).
4. **Phone sign-in.** Authentication > Providers > Phone: enable it and pick
   an SMS provider (Twilio, Vonage, MessageBird or Textlocal). Check it
   delivers to Tunisian numbers (+216) and set a rate limit.
5. **Edge Functions and secrets.**
   ```
   cp supabase/functions/.env.example supabase/functions/.env.local   # fill in two random secrets
   npx supabase secrets set --env-file supabase/functions/.env.local
   npx supabase functions deploy courier-webhook --no-verify-jwt
   npx supabase functions deploy send-push --no-verify-jwt
   npx supabase functions deploy delete-account
   ```
6. **Push notifications.** Database > Webhooks: new webhook on table
   `notifications`, event Insert, type Supabase Edge Function `send-push`,
   header `x-webhook-secret` = your `PUSH_WEBHOOK_SECRET`.
7. **The app.** Copy `mobile/.env.example` to `mobile/.env.local` and paste
   the project URL and anon key (Project Settings > API). Restart
   `npx expo start`: the app now uses the real backend.
8. **Your admin account.** Sign in once with your phone in the app, then in
   the SQL editor: `update profiles set is_admin = true where id = '<your user id>';`
9. **Backups.** Database > Backups: daily backups are on for paid plans;
   on the free plan, schedule a `pg_dump` yourself.

## What admins do (until the admin web app exists)

From the SQL editor, signed in as an admin user, or via these functions:
- approve ID checks: `admin_approve_id(user_id, true)`
- courier paid you the cash: `admin_reconcile_cod(array[order ids])`
- you paid a withdrawal: `admin_mark_payout(payout_id, true, 'bank reference')`
- decide a claim: `admin_resolve_claim(claim_id, refund boolean, 'note')`

## Not built yet

- Online payments (Konnect / Flouci): needs your merchant account. The
  schema and checkout already have the `payments` table and `payment_method`.
- A real courier: `courier-webhook` has a generic adapter; each courier needs
  its own mapping and, for pickups, a `book-pickup` function with their API key.
- The admin web app (claims, ID checks, COD reconciliation, payouts, reports).

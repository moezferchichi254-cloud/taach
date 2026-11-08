// Deletes the signed-in user's account: delete_account() anonymises the profile
// and removes listings (orders and money records are kept), then the auth user is removed.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { admin, json } from '../_shared/util.ts';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'unauthorised' }, 401);
  const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
  });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return json({ error: 'unauthorised' }, 401);
  const { error } = await asUser.rpc('delete_account');
  if (error) return json({ error: error.message }, 409); // e.g. open_orders
  const { error: delErr } = await admin().auth.admin.deleteUser(user.id, true); // soft delete keeps the id for the kept orders
  if (delErr) return json({ error: 'auth_delete_failed' }, 500);
  return json({ ok: true });
});

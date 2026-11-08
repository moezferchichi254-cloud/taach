// Courier status updates -> courier_update(). One adapter per courier; each maps
// the courier's payload to { eventId, orderId, status }. Set COURIER_WEBHOOK_SECRET
// and give the courier this URL. Statuses we use: picked_up, in_transit,
// out_for_delivery, delivered (COD: cash collected), refused, returned, lost.
import { admin, json, validSignature } from '../_shared/util.ts';

type Event = { eventId: string; orderId: string; status: string; description?: string };

// Adapter for a generic courier that signs the raw body (header x-signature) and sends
// { id, reference, status, label }. Replace or add one per courier you sign with.
function parseGeneric(body: Record<string, unknown>): Event | null {
  const map: Record<string, string> = {
    PICKED_UP: 'picked_up', IN_TRANSIT: 'in_transit', OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered', REFUSED: 'refused', RETURNED: 'returned', LOST: 'lost',
  };
  const status = map[String(body.status ?? '').toUpperCase()];
  if (!status || typeof body.id !== 'string' || typeof body.reference !== 'string') return null;
  return { eventId: body.id, orderId: body.reference, status, description: typeof body.label === 'string' ? body.label : undefined };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get('x-signature'), Deno.env.get('COURIER_WEBHOOK_SECRET')))) {
    return json({ error: 'signature' }, 401);
  }
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: 'json' }, 400); }
  const ev = parseGeneric(body);
  if (!ev) return json({ error: 'unrecognised event' }, 422);

  const db = admin();
  // idempotency: the courier may send the same event twice. An event that was
  // stored but failed to process (processed_at null) is processed again.
  const { error: storeErr } = await db.from('webhook_events')
    .upsert({ provider: 'courier', event_id: ev.eventId, payload: body }, { onConflict: 'provider,event_id', ignoreDuplicates: true });
  if (storeErr) return json({ error: 'store' }, 500);
  const { data: seen } = await db.from('webhook_events').select('processed_at').eq('provider', 'courier').eq('event_id', ev.eventId).single();
  if (seen?.processed_at) return json({ ok: true, duplicate: true });

  const { error } = await db.rpc('courier_update', { p_order: ev.orderId, p_status: ev.status, p_description: ev.description ?? null, p_raw: body });
  if (error) return json({ error: error.message }, 400); // the courier retries; nothing was marked processed
  await db.from('webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider', 'courier').eq('event_id', ev.eventId);
  return json({ ok: true });
});

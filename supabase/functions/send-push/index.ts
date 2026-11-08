// Sends a push notification for each new row in `notifications`.
// Wire it as a Supabase Database Webhook: table notifications, event INSERT,
// header x-webhook-secret = PUSH_WEBHOOK_SECRET.
import { admin, json } from '../_shared/util.ts';

type Row = { id: string; user_id: string; kind: string; payload: Record<string, unknown> };

const TEXT: Record<string, { fr: (p: Record<string, unknown>) => string; en: (p: Record<string, unknown>) => string }> = {
  message: { fr: (p) => `Nouveau message de ${p.from ?? ''}`, en: (p) => `New message from ${p.from ?? ''}` },
  offer: {
    fr: (p) => (p.status === 'accepted' ? 'Ton offre a été acceptée !' : p.status === 'declined' ? 'Ton offre a été refusée.' : 'Nouvelle offre reçue'),
    en: (p) => (p.status === 'accepted' ? 'Your offer was accepted!' : p.status === 'declined' ? 'Your offer was declined.' : 'New offer received'),
  },
  order_update: {
    fr: (p) => ({ sold: 'Tu as vendu un article ! Expédie-le sous 5 jours.', shipped: `Ta commande #${p.number} est en route.`, delivered: 'Colis livré. Confirme sous 2 jours.', completed: `Commande #${p.number} terminée.`, cancelled: `Commande #${p.number} annulée.`, cancelled_late: `Commande #${p.number} annulée : pas expédiée à temps.`, refused: `Colis refusé : commande #${p.number}.` } as Record<string, string>)[String(p.event)] ?? 'Mise à jour de commande',
    en: (p) => ({ sold: 'You sold an item! Ship it within 5 days.', shipped: `Your order #${p.number} is on its way.`, delivered: 'Parcel delivered. Confirm within 2 days.', completed: `Order #${p.number} completed.`, cancelled: `Order #${p.number} cancelled.`, cancelled_late: `Order #${p.number} cancelled: not shipped in time.`, refused: `Parcel refused: order #${p.number}.` } as Record<string, string>)[String(p.event)] ?? 'Order update',
  },
  favourite: { fr: (p) => `Quelqu’un aime « ${p.title ?? ''} »`, en: (p) => `Someone likes “${p.title ?? ''}”` },
  claim: { fr: () => 'Un problème a été signalé sur une commande.', en: () => 'A problem was reported on an order.' },
  payout: { fr: (p) => (p.paid ? 'Ton retrait a été versé.' : 'Ton retrait a échoué.'), en: (p) => (p.paid ? 'Your withdrawal was paid.' : 'Your withdrawal failed.') },
  id_check: { fr: (p) => (p.approved ? 'Identité vérifiée.' : 'Vérification refusée.'), en: (p) => (p.approved ? 'Identity verified.' : 'Check declined.') },
  feedback: { fr: () => 'Tu as reçu un nouvel avis.', en: () => 'You got a new review.' },
};

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) return json({ error: 'forbidden' }, 401);
  const { record } = (await req.json()) as { record: Row };
  const db = admin();
  const [{ data: tokens }, { data: profile }] = await Promise.all([
    db.from('push_tokens').select('token').eq('user_id', record.user_id),
    db.from('profiles').select('locale').eq('id', record.user_id).single(),
  ]);
  if (!tokens?.length) return json({ ok: true, sent: 0 });
  const t = TEXT[record.kind];
  const body = t ? (profile?.locale === 'en' ? t.en : t.fr)(record.payload ?? {}) : '';
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(tokens.map(({ token }) => ({ to: token, title: 'Taach', body, data: { kind: record.kind, ...record.payload }, sound: 'default' }))),
  });
  return json({ ok: res.ok, sent: tokens.length });
});

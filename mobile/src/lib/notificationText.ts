import type { NotificationKind } from '../data/types';

type P = Record<string, unknown>;
const orderEvents = {
  fr: { sold: 'Tu as vendu un article ! Expédie-le sous 5 jours.', shipped: 'Ta commande #{n} est en route.', delivered: 'Colis livré. Confirme que tout est OK sous 2 jours.', completed: 'Commande #{n} terminée. Le montant arrive sur ton solde.', cancelled: 'Commande #{n} annulée.', cancelled_late: 'Commande #{n} annulée : pas expédiée à temps.', refused: 'Colis refusé : commande #{n}.' },
  en: { sold: 'You sold an item! Ship it within 5 days.', shipped: 'Your order #{n} is on its way.', delivered: 'Parcel delivered. Confirm all is well within 2 days.', completed: 'Order #{n} completed. The money is on its way to your balance.', cancelled: 'Order #{n} cancelled.', cancelled_late: 'Order #{n} cancelled: not shipped in time.', refused: 'Parcel refused: order #{n}.' },
} as const;

/** Server notifications store a kind + payload; the text is built in the app's language. */
export function notificationText(kind: string, p: P): { fr: string; en: string } {
  const n = String(p.number ?? '');
  switch (kind as NotificationKind) {
    case 'message': return { fr: `Nouveau message de ${p.from ?? ''}`, en: `New message from ${p.from ?? ''}` };
    case 'offer':
      return p.status === 'accepted' ? { fr: 'Ton offre a été acceptée !', en: 'Your offer was accepted!' }
        : p.status === 'declined' ? { fr: 'Ton offre a été refusée.', en: 'Your offer was declined.' }
        : { fr: 'Nouvelle offre reçue', en: 'New offer received' };
    case 'order_update': {
      const e = String(p.event) as keyof typeof orderEvents.fr;
      return { fr: (orderEvents.fr[e] ?? 'Mise à jour de commande').replace('{n}', n), en: (orderEvents.en[e] ?? 'Order update').replace('{n}', n) };
    }
    case 'favourite': return { fr: `Quelqu’un a ajouté « ${p.title ?? ''} » à ses favoris.`, en: `Someone added “${p.title ?? ''}” to their favourites.` };
    case 'claim': return { fr: 'Un problème a été signalé sur une commande.', en: 'A problem was reported on an order.' };
    case 'payout': return p.paid ? { fr: 'Ton retrait a été versé.', en: 'Your withdrawal was paid.' } : { fr: 'Ton retrait a échoué. Le montant est revenu sur ton solde.', en: 'Your withdrawal failed. The money is back on your balance.' };
    case 'id_check': return p.approved ? { fr: 'Identité vérifiée. Tu peux retirer ton solde.', en: 'Identity verified. You can withdraw your balance.' } : { fr: 'Vérification d’identité refusée.', en: 'Identity check declined.' };
    case 'feedback': return { fr: 'Tu as reçu un nouvel avis.', en: 'You got a new review.' };
    default: return { fr: '', en: '' };
  }
}

export function notificationHref(p: P): string | null {
  if (p.conversation_id) return `/conversation/${p.conversation_id}`;
  if (p.order_id) return `/orders/${p.order_id}`;
  if (p.item_id) return `/item/${p.item_id}`;
  if (p.payout_id || p.approved != null) return '/wallet';
  return null;
}

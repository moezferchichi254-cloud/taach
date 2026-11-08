import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { respondOffer, selectMe, selectOffer, selectProfile, useStore } from '../data';
import type { Conversation } from '../data/types';
import { formatTND } from '../lib/money';
import { longDate } from '../lib/time';
import { useTheme } from '../theme';
import { Badge } from './Bits';
import { Button } from './Button';
import { Text } from './Text';

export function OfferCard({ offerId, conversation }: { offerId: string; conversation: Conversation }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const offer = useStore(selectOffer(offerId), offerId);
  const me = useStore(selectMe);
  const from = useStore(selectProfile(offer?.fromUserId ?? ''), offer?.fromUserId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!offer || !me) return null;
  const mine = offer.fromUserId === me.id;
  const iAmBuyer = conversation.buyerId === me.id;
  const lang = i18n.language;
  const tone = offer.status === 'accepted' ? 'success' : offer.status === 'pending' ? 'warning' : 'neutral';
  const act = (accept: boolean) => async () => {
    setBusy(true); setError(null);
    try { await respondOffer(offer.id, accept); } catch { setError(tr('common.error')); } finally { setBusy(false); }
  };

  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', width: '85%', borderWidth: 1, borderColor: t.c.border, borderRadius: t.radius.lg, padding: t.space[3], backgroundColor: t.c.bg, gap: t.space[2] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: t.space[2] }}>
        <Text variant="sm" color="text-muted" numberOfLines={1} style={{ flexShrink: 1 }}>{mine ? tr('chat.yourOffer') : tr('chat.offerFrom', { name: from?.username ?? '' })}</Text>
        <Badge label={tr(`chat.offerStatus.${offer.status}`)} tone={tone} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] }}>
        <Text variant="sm" color="text-muted" style={{ textDecorationLine: 'line-through' }}>{formatTND(offer.listPriceMillimes, lang)}</Text>
        <Text variant="xl">{formatTND(offer.amountMillimes, lang, { exact: offer.amountMillimes % 1000 !== 0 })}</Text>
      </View>
      {offer.status === 'pending' ? <Text variant="xs" color="text-muted">{tr('chat.expires', { date: longDate(offer.expiresAt, lang) })}</Text> : null}
      {offer.status === 'pending' && !mine ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
          <Button label={tr('chat.accept')} size="sm" onPress={act(true)} loading={busy} testID="offer-accept" />
          <Button label={tr('chat.counter')} size="sm" variant="secondary" onPress={() => router.push(`/offer/${offer.itemIds[0]}?items=${offer.itemIds.join(',')}&parent=${offer.id}`)} />
          <Button label={tr('chat.decline')} size="sm" variant="ghost" onPress={act(false)} />
        </View>
      ) : null}
      {offer.status === 'accepted' && iAmBuyer ? (
        <Button label={tr('chat.buyAtPrice')} size="sm" onPress={() => router.push(`/checkout/${offer.itemIds[0]}?items=${offer.itemIds.join(',')}&offer=${offer.id}`)} testID="offer-buy" />
      ) : null}
      {error ? <Text variant="xs" color="danger">{error}</Text> : null}
    </View>
  );
}

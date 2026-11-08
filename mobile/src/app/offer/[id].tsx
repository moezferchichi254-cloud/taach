import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Chip, Note } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { InfoRow, Section } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ApiError, makeOffer, selectItems, useStore } from '../../data';
import { formatTND, parseTND } from '../../lib/money';
import { MAX_OFFER_DISCOUNT } from '../../lib/pricing';
import { useTheme } from '../../theme';

// S16 make an offer (one item or a bundle; counter-offer with ?parent=)
export default function OfferScreen() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const p = useLocalSearchParams<{ id: string; items?: string; parent?: string }>();
  const ids = p.items ? p.items.split(',') : [p.id];
  const items = useStore(selectItems(ids), ids.join(','));
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = i18n.language;
  const list = items.reduce((a, i) => a + i.priceMillimes, 0);
  const min = Math.ceil(list * (1 - MAX_OFFER_DISCOUNT) / 10) * 10;
  const money = (m: number) => formatTND(m, lang, { exact: m % 1000 !== 0 });
  const suggestions = [0.9, 0.8, 0.7].map((f) => Math.round((list * f) / 500) * 500).filter((m) => m >= min);

  async function send() {
    const amount = parseTND(value);
    setError(null);
    if (amount == null || amount < min) return setError(tr('offer.tooLow', { min: money(min) }));
    if (amount > list) return setError(tr('offer.tooHigh'));
    setBusy(true);
    try {
      const offer = await makeOffer(ids, amount, p.parent ?? null);
      router.replace(`/conversation/${offer.conversationId}`);
    } catch (e) {
      setError(e instanceof ApiError && e.message === 'offer_too_low' ? tr('offer.tooLow', { min: money(min) }) : tr('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen grouped footer={<Button full size="lg" label={tr('offer.send')} onPress={send} loading={busy} testID="send-offer" />}>
      <Stack.Screen options={{ title: p.parent ? tr('offer.counterTitle') : tr('offer.title') }} />
      <Section>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          {items.map((i) => <Photo key={i.id} photo={i.photos[0]} label={i.title} style={{ width: 56, height: 70, borderRadius: t.radius.sm }} />)}
        </View>
        <View style={{ marginTop: t.space[3] }}>
          <InfoRow label={tr('offer.price')} value={money(list)} />
        </View>
      </Section>
      <Section style={{ gap: t.space[3] }}>
        <Field label={tr('offer.yourPrice')} value={value} onChangeText={setValue} keyboardType="decimal-pad" error={error} autoFocus testID="offer-amount" />
        <Text variant="xs" color="text-muted">{tr('offer.minHint', { min: money(min) })}</Text>
        {suggestions.length ? (
          <>
            <Text variant="xs" weight="600" color="text-muted">{tr('offer.suggest')}</Text>
            <View style={{ flexDirection: 'row', gap: t.space[2] }}>
              {suggestions.map((m) => <Chip key={m} label={money(m)} selected={parseTND(value) === m} onPress={() => setValue(String(m / 1000))} />)}
            </View>
          </>
        ) : null}
      </Section>
      <View style={{ padding: t.layout['screen-padding'] }}>
        <Note body={tr('offer.note')} />
      </View>
    </Screen>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Divider } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Choice } from '../../components/Choice';
import { InfoRow, Section } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ApiError, checkout, quote, selectItem, selectMyAddress, useStore } from '../../data/fake';
import type { DeliveryMethod, Quote } from '../../data/types';
import { formatTND } from '../../lib/money';
import { useTheme } from '../../theme';

// S18 checkout (cash on delivery first)
export default function Checkout() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useStore(selectItem(id), id);
  const address = useStore(selectMyAddress);
  const [delivery, setDelivery] = useState<DeliveryMethod>('courier');
  const [q, setQ] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = i18n.language;
  const money = (m: number) => formatTND(m, lang, { exact: true });

  useEffect(() => {
    setQ(null);
    quote([id], delivery).then(setQ).catch(() => setError(tr('checkout.unavailable')));
  }, [id, delivery, tr]);

  async function place() {
    setBusy(true);
    setError(null);
    try {
      const order = await checkout({ itemIds: [id], delivery, payment: 'cod', addressId: address?.id ?? null });
      router.replace(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof ApiError && e.message === 'items_unavailable' ? tr('checkout.unavailable') : tr('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen grouped footer={
      <>
        {error ? <Text variant="sm" color="danger" center>{error}</Text> : null}
        <Button full size="lg" label={q ? `${tr('checkout.place')} · ${money(q.totalMillimes)}` : tr('checkout.place')} onPress={place} loading={busy} disabled={!q} testID="place-order" />
      </>
    }>
      <Stack.Screen options={{ title: tr('checkout.title') }} />
      <Section>
        {item ? (
          <View style={{ alignItems: 'center', gap: t.space[2], paddingVertical: t.space[2] }}>
            <Photo photo={item.photos[0]} label={item.title} style={{ width: 96, height: 120, borderRadius: t.radius.sm }} />
            <Text variant="sm" numberOfLines={1}>{item.title}</Text>
          </View>
        ) : null}
        <Divider />
        <View style={{ paddingTop: t.space[2] }}>
          {q ? (
            <>
              <InfoRow label={tr('checkout.items')} value={money(q.itemsMillimes)} />
              <InfoRow label={tr('checkout.fee')} value={money(q.buyerFeeMillimes)} />
              <InfoRow label={tr('checkout.shipping')} value={money(q.shippingMillimes)} />
              <View style={{ height: t.space[1] }} />
              <InfoRow strong label={tr('checkout.total')} value={money(q.totalMillimes)} />
            </>
          ) : <Text variant="sm" color="text-muted">{tr('common.loading')}</Text>}
        </View>
      </Section>

      <Section title={tr('checkout.delivery')}>
        <Choice title={tr('checkout.courier')} body={tr('checkout.courierBody')} selected={delivery === 'courier'} onPress={() => setDelivery('courier')} />
        <Choice title={tr('checkout.hand')} body={tr('checkout.handBody')} selected={delivery === 'hand'} onPress={() => setDelivery('hand')} testID="hand" />
      </Section>

      {delivery === 'courier' ? (
        <Section title={tr('checkout.address')}>
          {address ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text weight="600">{address.fullName}</Text>
                <Text variant="sm" color="text-muted">{address.line1}</Text>
                <Text variant="sm" color="text-muted">{[address.postcode, address.city, address.governorate !== address.city ? address.governorate : null].filter(Boolean).join(' ')}</Text>
                <Text variant="sm" color="text-muted">{address.phone}</Text>
              </View>
              <Pencil size={18} color={t.c['text-muted']} accessibilityLabel={tr('common.edit')} />
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section title={tr('checkout.payment')}>
        <Choice title={tr('checkout.cod')} body={tr('checkout.codBody')} selected />
        <Choice title={tr('checkout.online')} selected={false} disabled tag={tr('checkout.onlineSoon')} />
      </Section>
    </Screen>
  );
}

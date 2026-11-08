import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Note } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Empty } from '../../components/Empty';
import { InfoRow, Section } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { Timeline } from '../../components/Timeline';
import { confirm } from '../../components/Confirm';
import { demoMode, cancelOrder, confirmReceived, devMarkDelivered, markShipped, selectClaim, selectItem, selectMe, selectMyFeedbackOn, selectOrder, selectProfile, useStore } from '../../data';
import { formatTND } from '../../lib/money';
import { useTheme } from '../../theme';

// S22 (buyer) / S23 (seller) order detail
export default function OrderScreen() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useStore(selectOrder(id), id);
  const me = useStore(selectMe);
  const item = useStore(selectItem(order?.itemIds[0] ?? ''), order?.itemIds[0] ?? '');
  const otherId = order ? (order.buyerId === me?.id ? order.sellerId : order.buyerId) : '';
  const other = useStore(selectProfile(otherId), otherId);
  const claim = useStore(selectClaim(id), id);
  const myReview = useStore(selectMyFeedbackOn(id), id);
  const [busy, setBusy] = useState(false);
  const lang = i18n.language;
  const money = (m: number) => formatTND(m, lang, { exact: true });
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' }) : '');

  if (!order) return <Screen><Empty title={tr('common.error')} /></Screen>;
  const isBuyer = order.buyerId === me?.id;
  const run = (fn: () => Promise<unknown>) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  async function cancel() {
    if (await confirm(tr('ordersExtra.cancelConfirm'), tr('ordersExtra.cancel'), tr('common.close'))) await run(() => cancelOrder(order!.id, isBuyer ? 'buyer' : 'seller'))();
  }

  let footer: React.ReactNode = null;
  if (order.status === 'confirmed') {
    footer = (
      <>
        {!isBuyer ? <Button full size="lg" label={tr('orders.shipIt')} onPress={run(() => markShipped(order.id))} loading={busy} testID="ship" /> : null}
        <Button full variant="ghost" label={tr('ordersExtra.cancel')} onPress={cancel} testID="cancel-order" />
      </>
    );
  } else if (order.status === 'completed' && !myReview) {
    footer = <Button full size="lg" label={tr('feedback.leave')} onPress={() => router.push(`/feedback/${order.id}`)} testID="leave-review" />;
  } else if (isBuyer && order.status === 'shipped') {
    footer = (
      <>
        {demoMode ? <Button full variant="secondary" label={tr('orders.devDelivered')} onPress={run(() => devMarkDelivered(order.id))} loading={busy} testID="dev-delivered" /> : null}
        {demoMode ? <Text variant="xs" color="text-muted" center>{tr('orders.devNote')}</Text> : null}
        <Button full variant="ghost" label={tr('claim.reasons.not_received')} onPress={() => router.push(`/claim/${order.id}`)} />
      </>
    );
  } else if (demoMode && order.status === 'shipped') {
    footer = (
      <>
        <Button full variant="secondary" label={tr('orders.devDelivered')} onPress={run(() => devMarkDelivered(order.id))} loading={busy} testID="dev-delivered" />
        <Text variant="xs" color="text-muted" center>{tr('orders.devNote')}</Text>
      </>
    );
  } else if (isBuyer && order.status === 'delivered') {
    footer = (
      <View style={{ flexDirection: 'row', gap: t.space[3] }}>
        <Button label={tr('orders.problem')} variant="secondary" size="lg" style={{ flex: 1 }} onPress={() => router.push(`/claim/${order.id}`)} />
        <Button label={tr('orders.confirm')} size="lg" style={{ flex: 1 }} onPress={run(() => confirmReceived(order.id))} loading={busy} testID="confirm" />
      </View>
    );
  }

  const tone = order.status === 'disputed' || order.status === 'cancelled' ? 'danger' : order.status === 'completed' ? 'success' : order.status === 'delivered' || order.status === 'confirmed' ? 'warning' : 'neutral';
  return (
    <Screen grouped footer={footer}>
      <Stack.Screen options={{ title: `#${order.number}` }} />
      <Section>
        <View style={{ flexDirection: 'row', gap: t.space[3], alignItems: 'center' }}>
          <Photo photo={item?.photos[0]} label={item?.title ?? ''} style={{ width: 56, height: 70, borderRadius: t.radius.sm }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1}>{item?.title}</Text>
            <Badge label={tr(`orders.status.${order.status}`)} tone={tone} />
          </View>
        </View>
        <View style={{ marginTop: t.space[5] }}><Timeline status={order.status} /></View>
      </Section>

      <Section>
        {order.status === 'confirmed' && !isBuyer ? <Note body={tr('orders.shipBy', { date: date(order.shipBy) })} tone="warning-bg" /> : null}
        {order.status === 'delivered' && isBuyer ? <Note body={tr('orders.confirmWindow', { date: date(order.completesAt) })} tone="warning-bg" /> : null}
        {order.status === 'completed' ? <Note body={tr('orders.completedNote')} tone="success-bg" /> : null}
        {order.status === 'disputed' && claim ? <Note title={tr('claim.open', { reason: tr(`claim.reasons.${claim.reason}`) })} body={tr('ordersExtra.disputed')} tone="danger-bg" /> : null}
        {order.status === 'cancelled' ? <Note body={tr('ordersExtra.cancelled')} /> : null}
        {myReview ? <Text variant="sm" color="text-muted" style={{ marginTop: t.space[2] }}>{tr('feedback.done', { stars: myReview.stars })}</Text> : null}
        {order.trackingNumber ? <View style={{ marginTop: t.space[3] }}><InfoRow label={tr('orders.tracking')} value={order.trackingNumber} /></View> : null}
        {other ? <InfoRow label={isBuyer ? tr('orders.seller') : tr('orders.buyer')} value={other.username} /> : null}
        <InfoRow label={tr('checkout.payment')} value={tr('checkout.cod')} />
      </Section>

      <Section>
        <InfoRow label={tr('checkout.items')} value={money(order.itemsMillimes)} />
        {order.bundleDiscountMillimes ? <InfoRow label={tr('bundle.discount')} value={`-${money(order.bundleDiscountMillimes)}`} /> : null}
        <InfoRow label={tr('checkout.fee')} value={money(order.buyerFeeMillimes)} />
        <InfoRow label={tr('checkout.shipping')} value={money(order.shippingMillimes)} />
        <InfoRow strong label={tr('checkout.total')} value={money(order.totalMillimes)} />
      </Section>
    </Screen>
  );
}

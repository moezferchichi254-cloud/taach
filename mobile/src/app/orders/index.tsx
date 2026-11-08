import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { Badge, Chip } from '../../components/Bits';
import { Empty } from '../../components/Empty';
import { Photo } from '../../components/Photo';
import { Text } from '../../components/Text';
import { selectMyOrders, useStore } from '../../data';
import type { Order } from '../../data/types';
import { formatTND } from '../../lib/money';
import { useTheme } from '../../theme';

function Row({ order }: { order: Order }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const item = useStore((s) => s.items.find((i) => i.id === order.itemIds[0]), order.itemIds[0]);
  return (
      <Pressable accessibilityRole="link" accessibilityLabel={`${item?.title ?? ''}, ${tr(`orders.status.${order.status}`)}`} onPress={() => router.push(`/orders/${order.id}`)} style={({ pressed }) => ({ flexDirection: 'row', gap: t.space[3], padding: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: pressed ? t.c.surface : t.c.bg })}>
        <Photo photo={item?.photos[0]} label={item?.title ?? ''} style={{ width: 56, height: 70, borderRadius: t.radius.sm }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={1}>{item?.title}</Text>
          <Text variant="sm" weight="700">{formatTND(order.totalMillimes, i18n.language, { exact: true })}</Text>
          <Badge label={tr(`orders.status.${order.status}`)} tone={order.status === 'completed' ? 'success' : 'neutral'} />
        </View>
      </Pressable>
  );
}

// S21 orders list
export default function Orders() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [role, setRole] = useState<'bought' | 'sold'>('bought');
  const orders = useStore(selectMyOrders(role), role);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: tr('orders.title') }} />
      <View style={{ flexDirection: 'row', gap: t.space[2], padding: t.layout['screen-padding'] }}>
        <Chip label={tr('orders.bought')} selected={role === 'bought'} onPress={() => setRole('bought')} />
        <Chip label={tr('orders.sold')} selected={role === 'sold'} onPress={() => setRole('sold')} />
      </View>
      <FlatList data={orders} keyExtractor={(o) => o.id} renderItem={({ item }) => <Row order={item} />} ListEmptyComponent={<Empty title={tr('orders.empty')} />} />
    </View>
  );
}

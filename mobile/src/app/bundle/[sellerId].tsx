import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { Badge } from '../../components/Bits';
import { Button } from '../../components/Button';
import { InfoRow } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectBundleDiscounts, selectWardrobe, useStore } from '../../data/fake';
import { formatTND } from '../../lib/money';
import { useTheme } from '../../theme';

// S17 bundle builder
export default function Bundle() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { sellerId, first } = useLocalSearchParams<{ sellerId: string; first?: string }>();
  const items = useStore((s) => selectWardrobe(sellerId)(s).filter((i) => i.status === 'active'), sellerId);
  const tiers = useStore(selectBundleDiscounts(sellerId), sellerId);
  const [picked, setPicked] = useState<string[]>(first ? [first] : []);
  const { width } = useWindowDimensions();
  const pad = t.layout['screen-padding'];
  const w = (width - pad * 2 - t.space[2] * 2) / 3;
  const lang = i18n.language;
  const sum = items.filter((i) => picked.includes(i.id)).reduce((a, i) => a + i.priceMillimes, 0);
  const tier = tiers.filter((x) => picked.length >= x.minItems).sort((a, b) => b.percent - a.percent)[0];
  const discount = tier ? Math.round((sum * tier.percent) / 100 / 10) * 10 : 0;
  const money = (m: number) => formatTND(m, lang, { exact: true });
  const ok = picked.length >= 2;
  const q = picked.join(',');

  return (
    <Screen scroll={false} footer={
      <>
        <InfoRow label={tr('bundle.selected', { count: picked.length })} value={money(sum)} />
        {discount ? <InfoRow label={`${tr('bundle.discount')} (-${tier!.percent} %)`} value={`-${money(discount)}`} /> : null}
        {!ok ? <Text variant="xs" color="text-muted" center>{tr('bundle.min2')}</Text> : null}
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Button label={tr('bundle.offer')} variant="secondary" size="lg" style={{ flex: 1 }} disabled={!ok} onPress={() => router.push(`/offer/${picked[0]}?items=${q}`)} />
          <Button label={tr('bundle.buy')} size="lg" style={{ flex: 1 }} disabled={!ok} onPress={() => router.push(`/checkout/${picked[0]}?items=${q}`)} testID="buy-bundle" />
        </View>
      </>
    }>
      <Stack.Screen options={{ title: tr('bundle.title') }} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={{ gap: t.space[2], paddingHorizontal: pad }}
        contentContainerStyle={{ gap: t.space[3], paddingBottom: t.space[4] }}
        ListHeaderComponent={
          <View style={{ padding: pad, gap: t.space[2] }}>
            <Text variant="sm" color="text-muted">{tr('bundle.hint')}</Text>
            <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
              {tiers.map((x) => <Badge key={x.minItems} label={tr('bundle.discountTier', { percent: x.percent, count: x.minItems })} tone="success" />)}
            </View>
          </View>
        }
        renderItem={({ item: i }) => {
          const on = picked.includes(i.id);
          return (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${i.title}, ${formatTND(i.priceMillimes, lang)}`}
              onPress={() => setPicked(on ? picked.filter((x) => x !== i.id) : [...picked, i.id])} style={{ width: w }}>
              <View style={{ borderRadius: t.radius.sm, overflow: 'hidden', borderWidth: 2, borderColor: on ? t.c.accent : 'transparent' }}>
                <Photo photo={i.photos[0]} label={i.title} style={{ width: '100%', aspectRatio: 1 / 1.3 }} />
                <View style={{ position: 'absolute', top: 6, end: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: on ? t.c.accent : t.c['photo-chip'], borderWidth: 1, borderColor: t.c.border, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Check size={14} color={t.c['on-accent']} /> : null}
                </View>
              </View>
              <Text variant="xs" numberOfLines={1} style={{ marginTop: 4 }}>{i.title}</Text>
              <Text variant="sm" weight="700">{formatTND(i.priceMillimes, lang)}</Text>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

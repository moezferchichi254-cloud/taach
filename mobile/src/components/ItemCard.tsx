import { Link } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { Item } from '../data/types';
import { buyerFee } from '../lib/pricing';
import { formatTND } from '../lib/money';
import { useTheme } from '../theme';
import { Badge } from './Bits';
import { Photo } from './Photo';
import { Text } from './Text';

export function ItemCard({ item }: { item: Item }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const price = formatTND(item.priceMillimes, i18n.language);
  const withFee = formatTND(item.priceMillimes + buyerFee(item.priceMillimes), i18n.language, { exact: true });
  const cond = tr(`item.condition.${item.condition}`);
  const a11y = [item.title, price, item.size, cond, item.isVintage ? tr('item.vintage') : null].filter(Boolean).join(', ');
  return (
    <Link href={`/item/${item.id}`} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.85 : 1 })}>
        <View style={{ borderRadius: t.radius.sm, overflow: 'hidden' }}>
          <Photo photo={item.photos[0]} label={item.title} style={{ width: '100%', aspectRatio: 1 / 1.3 }} />
          <View style={{ position: 'absolute', top: t.space[2], start: t.space[2], gap: 4 }}>
            {item.isVintage ? <Badge label={tr('item.vintage')} tone="vintage" /> : null}
            {item.status === 'reserved' ? <Badge label={tr('item.reserved')} tone="photo" /> : null}
            {item.status === 'sold' ? <Badge label={tr('item.sold')} tone="photo" /> : null}
          </View>
          <View style={{ position: 'absolute', bottom: t.space[2], end: t.space[2], flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: t.c['photo-chip'], borderRadius: t.radius.pill, paddingHorizontal: 6, height: 26 }}>
            <Heart size={14} color={t.c['on-photo-chip']} />
            {item.favouriteCount > 0 ? <Text variant="xs" style={{ color: t.c['on-photo-chip'] }}>{item.favouriteCount}</Text> : null}
          </View>
        </View>
        <View style={{ paddingTop: t.space[2], gap: 1 }}>
          <Text variant="sm" numberOfLines={1}>{item.brand ?? item.title}</Text>
          <Text variant="xs" color="text-muted" numberOfLines={1}>{[item.size, cond].filter(Boolean).join(' · ')}</Text>
          <Text variant="price" style={{ marginTop: 2 }}>{price}</Text>
          <Text variant="xs" color="text-muted" numberOfLines={1}>{withFee} {tr('item.inclFee')}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

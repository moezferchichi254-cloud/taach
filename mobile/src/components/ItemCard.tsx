import { Link } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { selectIsFavourite, toggleFavourite, useStore } from '../data';
import type { Item } from '../data/types';
import { buyerFee } from '../lib/pricing';
import { formatTND } from '../lib/money';
import { useTheme } from '../theme';
import { Badge } from './Bits';
import { Photo } from './Photo';
import { Text } from './Text';

export function FavouriteButton({ item, size = 'sm' }: { item: Item; size?: 'sm' | 'md' }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const on = useStore(selectIsFavourite(item.id), item.id);
  const icon = size === 'sm' ? 14 : 16;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? tr('favourites.remove') : tr('favourites.add')}
      accessibilityState={{ selected: on }}
      hitSlop={10}
      onPress={() => toggleFavourite(item.id)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.c['photo-chip'], borderRadius: t.radius.pill, paddingHorizontal: size === 'sm' ? 6 : t.space[2], height: size === 'sm' ? 26 : 30 }}
    >
      <Heart size={icon} color={t.c['on-photo-chip']} fill={on ? t.c['on-photo-chip'] : 'transparent'} />
      {item.favouriteCount > 0 ? <Text variant={size === 'sm' ? 'xs' : 'sm'} style={{ color: t.c['on-photo-chip'] }}>{item.favouriteCount}</Text> : null}
    </Pressable>
  );
}

export function ItemCard({ item, showStatus = true }: { item: Item; showStatus?: boolean }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const price = formatTND(item.priceMillimes, i18n.language);
  const withFee = formatTND(item.priceMillimes + buyerFee(item.priceMillimes), i18n.language, { exact: true });
  const cond = tr(`item.condition.${item.condition}`);
  const a11y = [item.title, price, item.size, cond, item.isVintage ? tr('item.vintage') : null].filter(Boolean).join(', ');
  return (
    <View style={{ width: '100%' }}>
      <View style={{ borderRadius: t.radius.sm, overflow: 'hidden' }}>
        <Link href={`/item/${item.id}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={a11y} style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.85 : 1 })}>
            <Photo photo={item.photos[0]} label={item.title} style={{ width: '100%', aspectRatio: 1 / 1.3 }} />
            <View style={{ position: 'absolute', top: t.space[2], start: t.space[2], gap: 4 }}>
              {item.isVintage ? <Badge label={tr('item.vintage')} tone="vintage" /> : null}
              {showStatus && item.status === 'reserved' ? <Badge label={tr('item.reserved')} tone="photo" /> : null}
              {showStatus && item.status === 'sold' ? <Badge label={tr('item.sold')} tone="photo" /> : null}
              {showStatus && item.status === 'hidden' ? <Badge label={tr('member.hidden')} tone="photo" /> : null}
            </View>
          </Pressable>
        </Link>
        {/* a sibling of the link, so tapping the heart doesn't open the item */}
        <View style={{ position: 'absolute', bottom: t.space[2], end: t.space[2] }}>
          <FavouriteButton item={item} />
        </View>
      </View>
      <Link href={`/item/${item.id}`} asChild>
        {/* same destination as the photo; hidden from screen readers to avoid a duplicate stop */}
        <Pressable accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden tabIndex={-1} style={{ paddingTop: t.space[2], gap: 1 }}>
          <Text variant="sm" numberOfLines={1}>{item.brand ?? item.title}</Text>
          <Text variant="xs" color="text-muted" numberOfLines={1}>{[item.size, cond].filter(Boolean).join(' · ')}</Text>
          <Text variant="price" style={{ marginTop: 2 }}>{price}</Text>
          <Text variant="xs" color="text-muted" numberOfLines={1}>{withFee} {tr('item.inclFee')}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

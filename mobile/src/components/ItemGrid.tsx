import { FlatList, useWindowDimensions, View, type FlatListProps } from 'react-native';
import type { Item } from '../data/types';
import { useTheme } from '../theme';
import { ItemCard } from './ItemCard';

/** 2-column grid with exact card widths. */
export function ItemGrid({ items, ...rest }: { items: Item[] } & Omit<FlatListProps<Item>, 'data' | 'renderItem'>) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const pad = t.layout['screen-padding'];
  const cardW = (width - pad * 2 - t.layout['grid-gap']) / 2;
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      numColumns={2}
      columnWrapperStyle={{ gap: t.layout['grid-gap'], paddingHorizontal: pad }}
      contentContainerStyle={{ gap: t.space[5], paddingBottom: t.space[6] }}
      renderItem={({ item }) => <View style={{ width: cardW }}><ItemCard item={item} /></View>}
      {...rest}
    />
  );
}

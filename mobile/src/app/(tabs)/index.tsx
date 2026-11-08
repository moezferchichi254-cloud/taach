import { router } from 'expo-router';
import { Bookmark, Search } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Bits';
import { Empty } from '../../components/Empty';
import { ItemGrid } from '../../components/ItemGrid';
import { Text } from '../../components/Text';
import { selectCategories, selectFeed, useStore } from '../../data/fake';
import { useTheme } from '../../theme';

// S02 home feed
export default function Feed() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const items = useStore(selectFeed);
  const cats = useStore(selectCategories);
  const [cat, setCat] = useState<string | null>(null);
  const shown = cat ? items.filter((i) => i.categoryId === cat) : items;
  const pad = t.layout['screen-padding'];

  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], paddingHorizontal: pad, paddingVertical: t.space[2] }}>
        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/search')}
          style={{ flex: 1, height: 44, borderRadius: t.radius.pill, backgroundColor: t.c['surface-2'], flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingHorizontal: t.space[4] }}
        >
          <Search size={20} color={t.c['text-muted']} />
          <Text color="text-muted" numberOfLines={1}>{tr('feed.searchPlaceholder')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('feed.savedSearches')} hitSlop={8} onPress={() => router.push('/saved-searches')}>
          <Bookmark size={24} color={t.c.text} />
        </Pressable>
      </View>
      <ItemGrid
        items={shown}
        ListHeaderComponent={
          <View style={{ gap: t.space[4] }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[2], paddingHorizontal: pad }}>
              <Chip label={tr('feed.all')} selected={!cat} onPress={() => setCat(null)} />
              {cats.map((c) => (
                <Chip key={c.id} label={i18n.language === 'en' ? c.nameEn : c.nameFr} selected={cat === c.id} onPress={() => setCat(c.id)} />
              ))}
            </ScrollView>
            <Text variant="lg" style={{ paddingHorizontal: pad, fontFamily: 'serif' }}>{tr('feed.newest')}</Text>
          </View>
        }
        ListEmptyComponent={<Empty title={tr('feed.empty')} body={tr('feed.emptyBody')} action={tr('tabs.sell')} onAction={() => router.push('/sell')} />}
      />
    </View>
  );
}

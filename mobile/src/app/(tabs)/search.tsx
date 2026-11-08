import { router } from 'expo-router';
import { Bookmark, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Bits';
import { Empty } from '../../components/Empty';
import { ItemGrid } from '../../components/ItemGrid';
import { Text } from '../../components/Text';
import { saveSearch, searchItems, selectCategories, useStore } from '../../data/fake';
import { activeFilterCount, setFilters, setSearch, useSearch } from '../../data/searchState';
import { useTheme } from '../../theme';

// S03 search + S04 results
export default function Search() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { query, filters } = useSearch();
  const cats = useStore(selectCategories);
  const key = JSON.stringify({ query, filters });
  const results = useStore((s) => searchItems(s, query, filters), key);
  const [saved, setSaved] = useState<string | null>(null);
  const pad = t.layout['screen-padding'];
  const n = activeFilterCount(filters);

  async function onSave() {
    await saveSearch(query, filters);
    setSaved(key);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingHorizontal: pad, paddingVertical: t.space[2] }}>
        <View style={{ flex: 1, height: 44, borderRadius: t.radius.pill, backgroundColor: t.c['surface-2'], flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingHorizontal: t.space[4] }}>
          <SearchIcon size={20} color={t.c['text-muted']} />
          <TextInput
            testID="search-input"
            accessibilityLabel={tr('search.title')}
            value={query}
            onChangeText={(v) => setSearch({ query: v })}
            placeholder={tr('search.placeholder')}
            placeholderTextColor={t.c['text-muted']}
            returnKeyType="search"
            autoCorrect={false}
            style={[t.type('base'), { flex: 1, color: t.c.text, padding: 0 }]}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel={tr('common.cancel')} hitSlop={8} onPress={() => setSearch({ query: '' })}>
              <X size={18} color={t.c['text-muted']} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[2], paddingHorizontal: pad, paddingBottom: t.space[2] }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/filters')}
            testID="open-filters"
            style={{ height: 36, paddingHorizontal: t.space[3], borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.c.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <SlidersHorizontal size={16} color={t.c.text} />
            <Text variant="sm" weight="500">{tr('search.filters')}{n ? ` · ${n}` : ''}</Text>
          </Pressable>
          <Chip label={tr('filters.vintageOnly')} selected={!!filters.vintageOnly} onPress={() => setFilters({ vintageOnly: !filters.vintageOnly })} />
          {cats.map((c) => (
            <Chip key={c.id} label={i18n.language === 'en' ? c.nameEn : c.nameFr} selected={filters.categoryId === c.id}
              onPress={() => setFilters({ categoryId: filters.categoryId === c.id ? null : c.id })} />
          ))}
        </ScrollView>
      </View>

      <ItemGrid
        items={results}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: pad, paddingTop: t.space[1] }}>
            <Text variant="sm" color="text-muted">{tr('search.results', { count: results.length })}</Text>
            {query || n ? (
              <Pressable accessibilityRole="button" onPress={onSave} disabled={saved === key} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} testID="save-search">
                <Bookmark size={16} color={t.c.text} fill={saved === key ? t.c.text : 'transparent'} />
                <Text variant="sm" weight="600">{saved === key ? tr('search.saved') : tr('search.save')}</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Empty title={tr('search.noResults')} body={tr('search.noResultsBody')} />}
      />
    </View>
  );
}

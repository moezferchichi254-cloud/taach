import { router, Stack } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { Toggle } from '../components/Toggle';
import { Empty } from '../components/Empty';
import { Text } from '../components/Text';
import { deleteSavedSearch, selectCategories, selectSavedSearches, toggleSearchAlerts, useStore } from '../data';
import { setSearch } from '../data/searchState';
import { useTheme } from '../theme';

// S30 saved searches
export default function SavedSearches() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const list = useStore(selectSavedSearches);
  const cats = useStore(selectCategories);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: tr('feed.savedSearches') }} />
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        ListEmptyComponent={<Empty title={tr('feed.savedSearches')} body={tr('search.noResultsBody')} />}
        renderItem={({ item: x }) => {
          const cat = cats.find((c) => c.id === x.filters.categoryId);
          const parts = [x.query ? `« ${x.query} »` : null, cat ? (i18n.language === 'en' ? cat.nameEn : cat.nameFr) : null, x.filters.vintageOnly ? tr('item.vintage') : null].filter(Boolean);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <Pressable style={{ flex: 1 }} accessibilityRole="button" onPress={() => { setSearch({ query: x.query, filters: x.filters }); router.push('/search'); }}>
                <Text weight="600" numberOfLines={1}>{parts.join(' · ') || tr('feed.all')}</Text>
              </Pressable>
              <Toggle value={x.alertsOn} onChange={() => toggleSearchAlerts(x.id)} label={tr('settings.notifications')} />
              <Pressable accessibilityRole="button" accessibilityLabel={tr('itemMenu.delete')} hitSlop={8} onPress={() => deleteSavedSearch(x.id)}>
                <Trash2 size={20} color={t.c['text-muted']} />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

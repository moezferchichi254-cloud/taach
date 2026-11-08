import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Toggle } from '../components/Toggle';
import { Chip } from '../components/Bits';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Section } from '../components/Grouped';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { searchItems, selectCategories, useStore } from '../data/fake';
import { resetFilters, setFilters, useSearch } from '../data/searchState';
import type { Condition, SearchFilters } from '../data/types';
import { parseTND } from '../lib/money';
import { CONDITIONS, SIZES } from '../lib/options';
import { useTheme } from '../theme';

const SORTS: NonNullable<SearchFilters['sort']>[] = ['relevance', 'newest', 'price_asc', 'price_desc'];

// S05 filters
export default function Filters() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { query, filters: f } = useSearch();
  const cats = useStore(selectCategories);
  const count = useStore((s) => searchItems(s, query, f).length, JSON.stringify({ query, f }));
  const toggle = <T,>(list: T[] | undefined, v: T) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);
  const dinars = (m?: number | null) => (m == null ? '' : String(m / 1000));

  return (
    <Screen grouped footer={<Button full size="lg" label={`${tr('filters.apply')} (${count})`} onPress={() => router.back()} testID="apply-filters" />}>
      <Stack.Screen options={{ title: tr('filters.title'), headerRight: () => <Button label={tr('filters.reset')} variant="ghost" size="sm" onPress={resetFilters} /> }} />
      <Section title={tr('filters.sort')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
          {SORTS.map((s) => <Chip key={s} label={tr(`filters.sorts.${s}`)} selected={(f.sort ?? 'relevance') === s} onPress={() => setFilters({ sort: s })} />)}
        </View>
      </Section>
      <Section title={tr('filters.category')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
          <Chip label={tr('filters.any')} selected={!f.categoryId} onPress={() => setFilters({ categoryId: null })} />
          {cats.map((c) => <Chip key={c.id} label={i18n.language === 'en' ? c.nameEn : c.nameFr} selected={f.categoryId === c.id} onPress={() => setFilters({ categoryId: c.id })} />)}
        </View>
      </Section>
      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1 }}>{tr('filters.vintageOnly')}</Text>
          <Toggle value={!!f.vintageOnly} onChange={(v) => setFilters({ vintageOnly: v })} label={tr('filters.vintageOnly')} />
        </View>
      </Section>
      <Section title={tr('filters.condition')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
          {CONDITIONS.map((c) => <Chip key={c} label={tr(`item.condition.${c}`)} selected={!!f.conditions?.includes(c)} onPress={() => setFilters({ conditions: toggle<Condition>(f.conditions, c) })} />)}
        </View>
      </Section>
      <Section title={tr('filters.size')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] }}>
          {SIZES.map((s) => <Chip key={s} label={s} selected={!!f.sizes?.includes(s)} onPress={() => setFilters({ sizes: toggle(f.sizes, s) })} />)}
        </View>
      </Section>
      <Section title={tr('filters.price')}>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Field style={{ flex: 1 }} label={tr('filters.min')} keyboardType="decimal-pad" defaultValue={dinars(f.minMillimes)} onChangeText={(v) => setFilters({ minMillimes: v ? parseTND(v) : null })} />
          <Field style={{ flex: 1 }} label={tr('filters.max')} keyboardType="decimal-pad" defaultValue={dinars(f.maxMillimes)} onChangeText={(v) => setFilters({ maxMillimes: v ? parseTND(v) : null })} />
        </View>
      </Section>
    </Screen>
  );
}

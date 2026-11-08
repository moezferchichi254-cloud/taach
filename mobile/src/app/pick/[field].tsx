import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable } from 'react-native';
import { Text } from '../../components/Text';
import { setDraft, useDraft, type Draft } from '../../data/draft';
import { selectCategories, useStore } from '../../data';
import { CONDITIONS, ERAS, PARCELS, SIZES } from '../../lib/options';
import { useTheme } from '../../theme';

const BRANDS = ['Adidas', 'Nike', 'Levi’s', 'Zara', 'Mango', 'Lacoste', 'Puma', 'H&M'];

// S12 / S13 and simple choice lists for the sell form
export default function Pick() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { field } = useLocalSearchParams<{ field: string }>();
  const d = useDraft();
  const cats = useStore(selectCategories);

  const lists: Record<string, { title: string; key: keyof Draft; options: { value: string | null; label: string }[] }> = {
    category: { title: tr('sell.category'), key: 'categoryId', options: cats.map((c) => ({ value: c.id, label: i18n.language === 'en' ? c.nameEn : c.nameFr })) },
    brand: { title: tr('sell.brand'), key: 'brand', options: [{ value: null, label: tr('item.noBrand') }, ...BRANDS.map((b) => ({ value: b, label: b }))] },
    size: { title: tr('sell.size'), key: 'size', options: SIZES.map((s) => ({ value: s, label: s })) },
    condition: { title: tr('sell.condition'), key: 'condition', options: CONDITIONS.map((c) => ({ value: c, label: tr(`item.condition.${c}`) })) },
    era: { title: tr('sell.era'), key: 'era', options: ERAS.map((e) => ({ value: e, label: e })) },
    parcel: { title: tr('sell.parcel'), key: 'parcelSize', options: PARCELS.map((p) => ({ value: p, label: tr(`sell.parcelSize.${p}`) })) },
  };
  const list = lists[field ?? ''];
  if (!list) return null;
  const current = d[list.key];

  return (
    <>
      <Stack.Screen options={{ title: list.title }} />
      <FlatList
        style={{ backgroundColor: t.c.bg }}
        data={list.options}
        keyExtractor={(o) => String(o.value)}
        renderItem={({ item: o }) => {
          const selected = current === o.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => { setDraft({ [list.key]: o.value } as Partial<Draft>); router.back(); }}
              style={({ pressed }) => ({ minHeight: t.layout['row-height'], flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: pressed ? t.c.surface : t.c.bg })}
            >
              <Text style={{ flex: 1 }} weight={selected ? '600' : '400'}>{o.label}</Text>
              {selected ? <Check size={20} color={t.c.text} /> : null}
            </Pressable>
          );
        }}
      />
    </>
  );
}

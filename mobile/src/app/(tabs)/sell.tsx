import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { Toggle } from '../../components/Toggle';
import { Badge } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { NavRow, Section } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { resetDraft, setDraft, useDraft } from '../../data/draft';
import { createItem, selectCategories, useStore } from '../../data';
import { parseTND } from '../../lib/money';
import { useTheme } from '../../theme';

// S10 + S11: photos and listing form
export default function Sell() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const d = useDraft();
  const cats = useStore(selectCategories);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const cat = cats.find((c) => c.id === d.categoryId);

  async function addPhotos() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 20 - d.photos.length, quality: 0.8 });
    if (!res.canceled) setDraft({ photos: [...d.photos, ...res.assets.map((a) => ({ uri: a.uri }))].slice(0, 20) });
  }

  async function publish() {
    const e: Record<string, string> = {};
    const price = parseTND(d.price);
    if (d.photos.length < 1) e.photos = tr('sell.errors.photos');
    if (d.title.trim().length < 3 || d.title.length > 80) e.title = tr('sell.errors.title');
    if (!d.categoryId) e.category = tr('sell.errors.category');
    if (!d.condition) e.condition = tr('sell.errors.condition');
    if (price == null || price < 1000) e.price = tr('sell.errors.price');
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const item = await createItem({
        title: d.title.trim(), description: d.description.trim(), categoryId: d.categoryId!, brand: d.brand, size: d.size,
        condition: d.condition!, isVintage: d.isVintage, era: d.isVintage ? d.era : null, priceMillimes: price!,
        parcelSize: d.parcelSize, photos: d.photos,
      });
      resetDraft();
      setErrors({});
      router.push(`/item/${item.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen grouped footer={<Button full size="lg" label={tr('sell.publish')} onPress={publish} loading={busy} testID="publish" />}>
      <Section>
        <Text variant="xs" color="text-muted" center>{tr('sell.photosHint')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[2], paddingVertical: t.space[3] }}>
          {d.photos.map((p, i) => (
            <View key={i} style={{ width: 96, height: 120, borderRadius: t.radius.sm, overflow: 'hidden' }}>
              <Photo photo={p} label={`${i + 1}`} style={{ width: '100%', height: '100%' }} />
              {i === 0 ? <View style={{ position: 'absolute', bottom: 4, start: 4 }}><Badge label={tr('sell.cover')} tone="photo" /></View> : null}
              <Pressable accessibilityRole="button" accessibilityLabel={tr('sell.removePhoto')} hitSlop={8} onPress={() => setDraft({ photos: d.photos.filter((_, j) => j !== i) })}
                style={{ position: 'absolute', top: 4, end: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: t.c['photo-chip'], alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} color={t.c['on-photo-chip']} />
              </Pressable>
            </View>
          ))}
          {d.photos.length < 20 ? (
            <Pressable accessibilityRole="button" accessibilityLabel={tr('sell.addPhoto')} onPress={addPhotos} testID="add-photo"
              style={{ width: 96, height: 120, borderRadius: t.radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: errors.photos ? t.c.danger : t.c['border-input'], alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Camera size={24} color={t.c.text} />
              <Text variant="xs" weight="600">{tr('sell.addPhoto')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        {errors.photos ? <Text variant="xs" color="danger">{errors.photos}</Text> : null}
        <Text variant="xs" color="text-muted">{d.photos.length}/20</Text>
      </Section>

      <Section style={{ gap: t.space[3] }}>
        <Field label={tr('sell.titleLabel')} value={d.title} onChangeText={(v) => setDraft({ title: v })} maxLength={80} error={errors.title} testID="title" />
        <Field label={tr('sell.descLabel')} value={d.description} onChangeText={(v) => setDraft({ description: v })} multiline maxLength={3000} placeholder={tr('sell.descPlaceholder')} />
      </Section>

      <Section flush>
        <NavRow label={tr('sell.category')} value={cat ? (i18n.language === 'en' ? cat.nameEn : cat.nameFr) : null} error={!!errors.category} onPress={() => router.push('/pick/category')} />
        <NavRow label={tr('sell.brand')} value={d.brand ?? tr('item.noBrand')} onPress={() => router.push('/pick/brand')} />
        <NavRow label={tr('sell.size')} value={d.size} onPress={() => router.push('/pick/size')} />
        <NavRow label={tr('sell.condition')} value={d.condition ? tr(`item.condition.${d.condition}`) : null} error={!!errors.condition} onPress={() => router.push('/pick/condition')} last />
      </Section>

      <Section flush>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: t.layout['row-height'], paddingHorizontal: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          <Text style={{ flex: 1 }}>{tr('sell.vintage')}</Text>
          <Toggle value={d.isVintage} onChange={(v) => setDraft({ isVintage: v })} label={tr('sell.vintage')} />
        </View>
        {d.isVintage ? <NavRow label={tr('sell.era')} value={d.era} onPress={() => router.push('/pick/era')} last /> : null}
      </Section>

      <Section style={{ gap: t.space[3] }}>
        <Field label={tr('sell.price')} value={d.price} onChangeText={(v) => setDraft({ price: v })} keyboardType="decimal-pad" placeholder="0" error={errors.price} testID="price" />
      </Section>
      <Section flush>
        <NavRow label={tr('sell.parcel')} value={tr(`sell.parcelSize.${d.parcelSize}`)} onPress={() => router.push('/pick/parcel')} last />
      </Section>
    </Screen>
  );
}

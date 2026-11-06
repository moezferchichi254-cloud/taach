import { router, useLocalSearchParams } from 'expo-router';
import { Heart, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Avatar, Badge, Divider, Note, Stars } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Empty } from '../../components/Empty';
import { InfoRow } from '../../components/Grouped';
import { Photo } from '../../components/Photo';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectCategories, selectItem, selectMe, selectProfile, useStore } from '../../data/fake';
import { formatTND } from '../../lib/money';
import { buyerFee } from '../../lib/pricing';
import { useTheme } from '../../theme';

// S06 item detail
export default function ItemScreen() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useStore(selectItem(id), id);
  const seller = useStore(selectProfile(item?.sellerId ?? ''), item?.sellerId ?? '');
  const me = useStore(selectMe);
  const cats = useStore(selectCategories);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const pad = t.layout['screen-padding'];

  if (!item) return <Screen><Empty title={tr('item.notFound')} action={tr('common.close')} onAction={() => router.back()} /></Screen>;
  const mine = item.sellerId === me?.id;
  const cat = cats.find((c) => c.id === item.categoryId);
  const lang = i18n.language;
  const total = item.priceMillimes + buyerFee(item.priceMillimes);

  const footer = mine ? (
    <Text color="text-muted" center>{tr('item.yourItem')}</Text>
  ) : item.status === 'active' ? (
    <View style={{ flexDirection: 'row', gap: t.space[3] }}>
      <Button label={tr('item.offer')} variant="secondary" size="lg" style={{ flex: 1 }} onPress={() => router.push(`/offer/${item.id}`)} />
      <Button label={tr('item.buy')} size="lg" style={{ flex: 1 }} onPress={() => router.push(`/checkout/${item.id}`)} testID="buy" />
    </View>
  ) : (
    <Badge label={tr(item.status === 'sold' ? 'item.sold' : 'item.reserved')} />
  );

  return (
    <Screen footer={footer}>
      <View>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {item.photos.map((p, i) => (
            <Photo key={i} photo={p} label={`${item.title}, ${i + 1}/${item.photos.length}`} style={{ width, height: width * 1.25 }} />
          ))}
        </ScrollView>
        {item.photos.length > 1 ? (
          <View style={{ position: 'absolute', bottom: t.space[3], alignSelf: 'center', flexDirection: 'row', gap: 6 }}>
            {item.photos.map((_, i) => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.c['photo-chip'], opacity: i === page ? 1 : 0.5 }} />)}
          </View>
        ) : null}
        <View style={{ position: 'absolute', bottom: t.space[3], end: t.space[3], flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.c['photo-chip'], borderRadius: t.radius.pill, paddingHorizontal: t.space[2], height: 30 }}>
          <Heart size={16} color={t.c['on-photo-chip']} />
          <Text variant="sm" style={{ color: t.c['on-photo-chip'] }}>{item.favouriteCount}</Text>
        </View>
      </View>

      {seller ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: pad }}>
          <Avatar name={seller.displayName} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="sm" weight="600">{seller.username}</Text>
            <Stars value={seller.ratingAvg} count={seller.ratingCount} />
          </View>
          {!mine ? <Button label={tr('item.message')} variant="secondary" size="sm" onPress={() => router.push(`/conversation/${item.id}`)} /> : null}
        </View>
      ) : null}
      <Divider />

      <View style={{ padding: pad, gap: t.space[1] }}>
        <View style={{ flexDirection: 'row', gap: t.space[2], marginBottom: t.space[1] }}>
          {item.isVintage ? <Badge label={item.era ? `${tr('item.vintage')} · ${item.era}` : tr('item.vintage')} tone="vintage" /> : null}
        </View>
        <Text variant="lg">{item.title}</Text>
        <Text variant="sm" color="text-muted">{[item.size, tr(`item.condition.${item.condition}`), item.brand ?? tr('item.noBrand')].filter(Boolean).join(' · ')}</Text>
        <Text variant="sm" color="text-muted" style={{ marginTop: t.space[3] }}>{formatTND(item.priceMillimes, lang)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="lg" weight="700">{formatTND(total, lang, { exact: true })}</Text>
          <Text variant="sm" color="text-muted">{tr('item.inclFee')}</Text>
          <ShieldCheck size={16} color={t.c.text} />
        </View>
      </View>

      <View style={{ paddingHorizontal: pad }}>
        <Note title={tr('item.protectionTitle')} body={tr('item.protectionBody')} />
      </View>

      {item.description ? <Text style={{ padding: pad }}>{item.description}</Text> : null}
      <View style={{ paddingHorizontal: pad }}>
        <Text variant="sm" weight="600" style={{ marginBottom: t.space[1] }}>{tr('item.details')}</Text>
        {cat ? <InfoRow label={tr('item.category')} value={lang === 'en' ? cat.nameEn : cat.nameFr} /> : null}
        <InfoRow label={tr('item.brand')} value={item.brand ?? tr('item.noBrand')} />
        {item.size ? <InfoRow label={tr('item.size')} value={item.size} /> : null}
        {item.era ? <InfoRow label={tr('item.era')} value={item.era} /> : null}
        <InfoRow label={tr('item.uploaded')} value={new Date(item.createdAt).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR')} />
      </View>
    </Screen>
  );
}

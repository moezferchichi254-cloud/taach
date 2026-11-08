import { router, Stack, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Ban, Flag } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Avatar, Badge, Chip, Note, Stars } from '../../components/Bits';
import { Button } from '../../components/Button';
import { Empty } from '../../components/Empty';
import { ItemGrid } from '../../components/ItemGrid';
import { ReviewRow } from '../../components/ReviewRow';
import { Text } from '../../components/Text';
import {
  selectBundleDiscounts, selectFeedbackFor, selectIsBlocked, selectMe, selectProfile, selectWardrobe, toggleBlock, useStore,
} from '../../data/fake';
import { useTheme } from '../../theme';

// S07 member profile: wardrobe + reviews (S08 inline)
export default function Member() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useStore(selectProfile(id), id);
  const me = useStore(selectMe);
  const items = useStore(selectWardrobe(id), id);
  const reviews = useStore(selectFeedbackFor(id), id);
  const tiers = useStore(selectBundleDiscounts(id), id);
  const blocked = useStore(selectIsBlocked(id), id);
  const [tab, setTab] = useState<'wardrobe' | 'reviews'>('wardrobe');
  const pad = t.layout['screen-padding'];
  if (!p) return <Empty title={tr('common.error')} />;
  const mine = me?.id === id;
  const shown = mine ? items : p.holidayMode ? [] : items.filter((i) => i.status !== 'hidden');
  const best = tiers.at(-1);

  const header = (
    <View style={{ padding: pad, gap: t.space[3] }}>
      <View style={{ flexDirection: 'row', gap: t.space[3], alignItems: 'center' }}>
        <Avatar name={p.displayName} size={72} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="xl">{p.username}</Text>
          <Stars value={p.ratingAvg} count={p.ratingCount} />
          <Text variant="sm" color="text-muted">{[p.city, p.governorate !== p.city ? p.governorate : null].filter(Boolean).join(', ')}</Text>
          {p.idVerified ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <BadgeCheck size={16} color={t.c.success} />
              <Text variant="xs" color="success" weight="600">{tr('member.verified')}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {p.bio ? <Text variant="sm">{p.bio}</Text> : null}
      {p.holidayMode && !mine ? <Note body={tr('member.holiday')} tone="warning-bg" /> : null}
      {!mine && best && !p.holidayMode && shown.some((i) => i.status === 'active') ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <Badge label={tr('member.bundleDeal', { percent: best.percent })} tone="success" />
          <Button label={tr('member.bundle')} size="sm" onPress={() => router.push(`/bundle/${id}`)} />
        </View>
      ) : null}
      {!mine ? (
        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          <Button label={blocked ? tr('member.unblock') : tr('member.block')} variant="ghost" size="sm" icon={<Ban size={16} color={t.c['text-muted']} />} onPress={() => toggleBlock(id)} />
          <Button label={tr('member.report')} variant="ghost" size="sm" icon={<Flag size={16} color={t.c['text-muted']} />} onPress={() => router.push(`/report?type=user&id=${id}`)} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: t.space[2] }}>
        <Chip label={`${tr('member.wardrobe')} (${shown.length})`} selected={tab === 'wardrobe'} onPress={() => setTab('wardrobe')} />
        <Chip label={`${tr('member.reviews')} (${reviews.length})`} selected={tab === 'reviews'} onPress={() => setTab('reviews')} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: p.username }} />
      {tab === 'wardrobe' ? (
        <ItemGrid items={shown} ListHeaderComponent={header} ListEmptyComponent={<Empty title={tr('member.emptyWardrobe')} />} />
      ) : (
        <ItemGrid
          items={[]}
          ListHeaderComponent={
            <View>
              {header}
              <View style={{ paddingHorizontal: pad }}>
                {reviews.length ? reviews.map((f) => <ReviewRow key={f.id} f={f} />) : <Empty title={tr('reviews.empty')} />}
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

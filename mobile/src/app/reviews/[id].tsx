import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';
import { Stars } from '../../components/Bits';
import { Empty } from '../../components/Empty';
import { ReviewRow } from '../../components/ReviewRow';
import { Text } from '../../components/Text';
import { selectFeedbackFor, selectProfile, useStore } from '../../data/fake';
import { useTheme } from '../../theme';

// S08 reviews
export default function Reviews() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useStore(selectProfile(id), id);
  const list = useStore(selectFeedbackFor(id), id);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: tr('reviews.title') }} />
      <FlatList
        data={list}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ paddingHorizontal: t.layout['screen-padding'] }}
        ListHeaderComponent={p ? (
          <View style={{ alignItems: 'center', paddingVertical: t.space[5], gap: t.space[2] }}>
            <Text variant="2xl">{p.ratingAvg.toFixed(1)}</Text>
            <Stars value={p.ratingAvg} size={20} />
            <Text variant="sm" color="text-muted">{tr('reviews.count', { count: p.ratingCount })}</Text>
          </View>
        ) : undefined}
        ListEmptyComponent={<Empty title={tr('reviews.empty')} />}
        renderItem={({ item }) => <ReviewRow f={item} />}
      />
    </View>
  );
}

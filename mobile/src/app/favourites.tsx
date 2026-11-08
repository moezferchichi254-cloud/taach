import { router, Stack } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Empty } from '../components/Empty';
import { ItemGrid } from '../components/ItemGrid';
import { selectFavourites, useStore } from '../data';
import { useTheme } from '../theme';

// S09 favourites
export default function Favourites() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const items = useStore(selectFavourites);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: tr('favourites.title') }} />
      <ItemGrid
        items={items}
        contentContainerStyle={{ gap: t.space[5], paddingVertical: t.space[4] }}
        ListEmptyComponent={<Empty icon={<Heart size={32} color={t.c['text-muted']} />} title={tr('favourites.empty')} body={tr('favourites.emptyBody')} action={tr('tabs.search')} onAction={() => router.push('/search')} />}
      />
    </View>
  );
}

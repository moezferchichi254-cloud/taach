import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import type { Photo as P } from '../data/types';
import { useTheme } from '../theme';
import { Photo } from './Photo';
import { Text } from './Text';

/** Small horizontal picker for claim evidence and ID photos. */
export function PhotoPicker({ photos, onChange, max = 5, label, testID }: { photos: P[]; onChange: (p: P[]) => void; max?: number; label?: string; testID?: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  async function add() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: max > 1, selectionLimit: max - photos.length, quality: 0.7 });
    if (!res.canceled) onChange([...photos, ...res.assets.map((a) => ({ uri: a.uri }))].slice(0, max));
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[2] }}>
      {photos.map((p, i) => (
        <View key={i} style={{ width: 80, height: 100, borderRadius: t.radius.sm, overflow: 'hidden' }}>
          <Photo photo={p} label={`${i + 1}`} style={{ width: '100%', height: '100%' }} />
          <Pressable accessibilityRole="button" accessibilityLabel={tr('sell.removePhoto')} hitSlop={8} onPress={() => onChange(photos.filter((_, j) => j !== i))}
            style={{ position: 'absolute', top: 4, end: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: t.c['photo-chip'], alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} color={t.c['on-photo-chip']} />
          </Pressable>
        </View>
      ))}
      {photos.length < max ? (
        <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label ?? tr('sell.addPhoto')} onPress={add}
          style={{ width: 80, height: 100, borderRadius: t.radius.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: t.c['border-input'], alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Camera size={20} color={t.c.text} />
          <Text variant="xs" weight="600" center>{label ?? tr('sell.addPhoto')}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

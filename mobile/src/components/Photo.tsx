import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { View, type ViewStyle } from 'react-native';
import type { Photo as P } from '../data/types';
import { useTheme } from '../theme';

/** A listing photo, or a flat placeholder tone for demo data. */
export function Photo({ photo, style, label }: { photo?: P; style?: ViewStyle; label: string }) {
  const t = useTheme();
  if (photo?.uri) {
    return <Image source={{ uri: photo.uri }} accessibilityLabel={label} contentFit="cover" style={[{ backgroundColor: t.c['surface-2'] }, style as object]} />;
  }
  return (
    <View accessible accessibilityLabel={label} style={[{ backgroundColor: photo?.tone ?? t.c['surface-2'], alignItems: 'center', justifyContent: 'center' }, style]}>
      {!photo?.tone ? <ImageOff size={24} color={t.c['text-muted']} /> : null}
    </View>
  );
}

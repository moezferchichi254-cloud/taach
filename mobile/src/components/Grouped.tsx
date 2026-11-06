import { ChevronRight } from 'lucide-react-native';
import { I18nManager, Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/** White section on the grey page, with an 8px band before it. */
export function Section({ title, children, style, flush }: { title?: string; children: React.ReactNode; style?: ViewStyle; flush?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: t.layout['section-gap'] }}>
      <View style={[{ backgroundColor: t.c.bg, paddingHorizontal: flush ? 0 : t.layout['screen-padding'], paddingVertical: flush ? 0 : t.space[3] }, style]}>
        {title ? <Text variant="xs" color="text-muted" weight="600" style={{ marginBottom: t.space[2], paddingHorizontal: flush ? t.layout['screen-padding'] : 0, paddingTop: flush ? t.space[3] : 0 }}>{title}</Text> : null}
        {children}
      </View>
    </View>
  );
}

export function NavRow({ label, value, onPress, error, last }: { label: string; value?: string | null; onPress?: () => void; error?: boolean; last?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: t.layout['row-height'], flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.layout['screen-padding'],
        borderBottomWidth: last ? 0 : 1, borderBottomColor: t.c.border, backgroundColor: pressed ? t.c.surface : t.c.bg,
      })}
    >
      <Text style={{ flex: 1 }} color={error ? 'danger' : 'text'}>{label}</Text>
      {value ? <Text color="text-muted" numberOfLines={1} style={{ maxWidth: '55%', marginEnd: t.space[2] }}>{value}</Text> : null}
      <ChevronRight size={20} color={t.c['text-muted']} style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }} />
    </Pressable>
  );
}

export function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: t.space[1] + 2 }}>
      <Text variant={strong ? 'lg' : 'sm'} color={strong ? 'text' : 'text-muted'}>{label}</Text>
      <Text variant={strong ? 'lg' : 'sm'} weight={strong ? '700' : '400'} style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

import { Star } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useTheme, type Colors } from '../theme';
import { Text } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 36, paddingHorizontal: t.space[4] - 2, borderRadius: t.radius.pill, justifyContent: 'center',
        backgroundColor: selected ? t.c.accent : t.c['surface-2'], opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="sm" weight="500" style={{ color: selected ? t.c['on-accent'] : t.c.text }}>{label}</Text>
    </Pressable>
  );
}

type Tone = 'vintage' | 'success' | 'warning' | 'danger' | 'neutral' | 'photo';
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = useTheme();
  const map: Record<Tone, [string, string]> = {
    vintage: [t.c['vintage-bg'], t.c.vintage],
    success: [t.c['success-bg'], t.c.success],
    warning: [t.c['warning-bg'], t.c.warning],
    danger: [t.c['danger-bg'], t.c.danger],
    neutral: [t.c['surface-2'], t.c.text],
    photo: [t.c['photo-chip'], t.c['on-photo-chip']], // on top of photos, same in both themes
  };
  const [bg, fg] = map[tone];
  return (
    <View style={{ height: 22, paddingHorizontal: t.space[2], borderRadius: t.radius.sm, backgroundColor: bg, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text variant="xs" weight="600" style={{ color: fg }}>{label}</Text>
    </View>
  );
}

export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel={`${value.toFixed(1)} / 5${count != null ? `, ${count}` : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={t.c.text} fill={n <= Math.round(value) ? t.c.text : 'transparent'} />
      ))}
      {count != null ? <Text variant="xs" color="text-muted" style={{ marginStart: 4 }}>({count})</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const t = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.c['surface-2'], alignItems: 'center', justifyContent: 'center' }}>
      <Text variant={size >= 48 ? 'lg' : 'sm'} weight="600">{name.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.c.border }} />;
}

export function Note({ title, body, tone = 'surface' }: { title?: string; body: string; tone?: keyof Colors }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.c[tone], borderRadius: t.radius.lg, padding: t.space[4] }}>
      <Text variant="xs" color="text-muted">
        {title ? <Text variant="xs" weight="700">{title} </Text> : null}
        {body}
      </Text>
    </View>
  );
}

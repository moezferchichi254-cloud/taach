import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  label, onPress, variant = 'primary', size = 'md', disabled, loading, full, icon, style, testID,
}: {
  label: string; onPress?: () => void; variant?: Variant; size?: Size; disabled?: boolean;
  loading?: boolean; full?: boolean; icon?: React.ReactNode; style?: ViewStyle; testID?: string;
}) {
  const t = useTheme();
  const h = { sm: 36, md: t.layout['min-touch'], lg: 52 }[size];
  const bg = { primary: t.c.accent, secondary: t.c.bg, ghost: 'transparent', danger: t.c.danger }[variant];
  const fg = { primary: t.c['on-accent'], secondary: t.c.accent, ghost: t.c.text, danger: t.c['on-danger'] }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        {
          height: h, paddingHorizontal: size === 'sm' ? t.space[3] : t.space[5], borderRadius: t.radius.md,
          backgroundColor: pressed && variant === 'primary' ? t.c['accent-pressed'] : bg,
          borderWidth: variant === 'secondary' ? 1 : 0, borderColor: t.c.accent,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space[2],
          opacity: disabled ? 0.4 : pressed && variant !== 'primary' ? 0.7 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <View>{icon}</View> : null}
      <Text variant={size === 'sm' ? 'sm' : 'base'} weight="600" style={{ color: fg }}>{label}</Text>
    </Pressable>
  );
}

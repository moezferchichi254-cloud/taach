import { Platform, Switch } from 'react-native';
import { useTheme } from '../theme';

/** On/off switch in the palette (black track when on, never the platform green). */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  const web = Platform.OS === 'web' ? ({ activeThumbColor: t.c['on-accent'], activeTrackColor: t.c.accent } as object) : {};
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ true: t.c.accent, false: t.c['surface-2'] }}
      thumbColor={value ? t.c['on-accent'] : t.c.bg}
      ios_backgroundColor={t.c['surface-2']}
      {...web}
    />
  );
}

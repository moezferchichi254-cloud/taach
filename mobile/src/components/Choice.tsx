import { Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { Badge } from './Bits';
import { Text } from './Text';

/** Radio row with a title and a line of explanation. */
export function Choice({ title, body, selected, onPress, disabled, tag, testID }: {
  title: string; body?: string; selected: boolean; onPress?: () => void; disabled?: boolean; tag?: string; testID?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ flexDirection: 'row', gap: t.space[3], paddingVertical: t.space[3], opacity: disabled ? 0.4 : 1 }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 7 : 1.5, borderColor: selected ? t.c.accent : t.c['border-input'], marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
          <Text weight="600">{title}</Text>
          {tag ? <Badge label={tag} /> : null}
        </View>
        {body ? <Text variant="sm" color="text-muted">{body}</Text> : null}
      </View>
    </Pressable>
  );
}

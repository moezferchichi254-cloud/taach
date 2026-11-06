import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Text';

/** Floating-label field: small label inside the box, value under it. */
export function Field({ label, error, multiline, style, ...rest }: TextInputProps & { label: string; error?: string | null }) {
  const t = useTheme();
  const [focus, setFocus] = useState(false);
  const border = error ? t.c.danger : focus ? t.c.accent : t.c['border-input'];
  return (
    <View style={style}>
      <View
        style={{
          minHeight: multiline ? 120 : t.layout['field-height'], borderWidth: focus || error ? 2 : 1, borderColor: border,
          borderRadius: t.radius.sm, paddingHorizontal: t.space[3] - (focus || error ? 1 : 0),
          paddingTop: t.space[2], paddingBottom: t.space[2], backgroundColor: t.c.bg,
        }}
      >
        <Text variant="xs" color="text-muted" weight="500">{label}</Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={t.c['text-muted']}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          multiline={multiline}
          maxFontSizeMultiplier={1.6}
          style={[t.type('base'), { color: t.c.text, padding: 0, marginTop: 2, textAlignVertical: multiline ? 'top' : 'center', minHeight: multiline ? 80 : undefined }]}
          {...rest}
        />
      </View>
      {error ? <Text variant="xs" color="danger" style={{ marginTop: t.space[1] }} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

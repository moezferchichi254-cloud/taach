import { Text as RNText, type TextProps } from 'react-native';
import { useTheme, type TypeRole, type Colors } from '../theme';

type Props = TextProps & { variant?: TypeRole; color?: keyof Colors; weight?: '400' | '500' | '600' | '700'; center?: boolean };

export function Text({ variant = 'base', color = 'text', weight, center, style, ...rest }: Props) {
  const t = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[t.type(variant), { color: t.c[color] }, weight && { fontWeight: weight }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}

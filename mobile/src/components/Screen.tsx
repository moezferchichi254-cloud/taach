import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** Grey page for grouped screens, white for feeds. Optional sticky footer. */
export function Screen({ children, footer, grouped, scroll = true, ...rest }: ScrollViewProps & { footer?: React.ReactNode; grouped?: boolean; scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bg = grouped ? t.c.surface : t.c.bg;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: t.space[6] }} keyboardShouldPersistTaps="handled" {...rest}>{children}</ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer ? (
        <View style={{ padding: t.layout['screen-padding'], paddingBottom: Math.max(insets.bottom, t.space[4]), backgroundColor: t.c.bg, borderTopWidth: 1, borderTopColor: t.c.border, gap: t.space[2] }}>
          {footer}
        </View>
      ) : null}
    </View>
  );
}

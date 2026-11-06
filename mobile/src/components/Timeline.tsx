import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { OrderStatus } from '../data/types';
import { useTheme } from '../theme';
import { Text } from './Text';

const STEPS = ['ordered', 'shipped', 'delivered', 'completed'] as const;
const reached: Record<OrderStatus, number> = {
  pending: -1, confirmed: 0, shipped: 1, delivered: 2, completed: 3,
  cancelled: 0, refused: 1, disputed: 2, refunded: 2,
};

export function Timeline({ status }: { status: OrderStatus }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const at = reached[status];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} accessible accessibilityLabel={tr(`orders.status.${status}`)}>
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <View key={s} style={{ flex: 1, alignItems: 'center', gap: t.space[1] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
              <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : done ? t.c.accent : t.c.border }} />
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? t.c.accent : t.c['surface-2'], alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Check size={14} color={t.c['on-accent']} /> : null}
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: i === STEPS.length - 1 ? 'transparent' : i < at ? t.c.accent : t.c.border }} />
            </View>
            <Text variant="xs" color={done ? 'text' : 'text-muted'} weight={i === at ? '700' : '500'} center>{tr(`orders.steps.${s}`)}</Text>
          </View>
        );
      })}
    </View>
  );
}

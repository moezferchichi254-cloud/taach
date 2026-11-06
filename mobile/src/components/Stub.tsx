import { Stack } from 'expo-router';
import { Construction } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { Empty } from './Empty';
import { Screen } from './Screen';
import { Text } from './Text';

/** Placeholder for a planned screen (recon S-ID). Replaced screen by screen. */
export function Stub({ id, title }: { id: string; title: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <Empty icon={<Construction size={32} color={t.c['text-muted']} />} title={tr('common.comingSoon')} body={tr('common.comingSoonBody')} />
      <Text variant="xs" color="text-muted" center>{id}</Text>
    </Screen>
  );
}

import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { selectProfile, useStore } from '../data/fake';
import type { Feedback } from '../data/types';
import { longDate } from '../lib/time';
import { useTheme } from '../theme';
import { Avatar, Stars } from './Bits';
import { Text } from './Text';

export function ReviewRow({ f }: { f: Feedback }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const from = useStore(selectProfile(f.fromUserId ?? ''), f.fromUserId ?? '');
  return (
    <View style={{ flexDirection: 'row', gap: t.space[3], paddingVertical: t.space[3], borderBottomWidth: 1, borderBottomColor: t.c.border }}>
      <Avatar name={f.isAutomatic ? 'T' : from?.displayName ?? '?'} size={32} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="sm" weight="600">{f.isAutomatic ? 'Taach' : from?.username}</Text>
          <Text variant="xs" color="text-muted">{longDate(f.createdAt, i18n.language)}</Text>
        </View>
        <Stars value={f.stars} size={12} />
        <Text variant="sm" color={f.isAutomatic ? 'text-muted' : 'text'}>{f.isAutomatic ? tr('reviews.automatic') : f.body}</Text>
      </View>
    </View>
  );
}

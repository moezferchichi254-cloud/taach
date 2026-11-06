import { View } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Text } from './Text';

export function Empty({ title, body, action, onAction, icon }: { title: string; body?: string; action?: string; onAction?: () => void; icon?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: t.space[7], gap: t.space[3] }}>
      {icon}
      <Text variant="xl" center style={{ fontFamily: 'serif' }}>{title}</Text>
      {body ? <Text color="text-muted" center>{body}</Text> : null}
      {action ? <Button label={action} onPress={onAction} /> : null}
    </View>
  );
}

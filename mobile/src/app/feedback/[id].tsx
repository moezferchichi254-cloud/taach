import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Section } from '../../components/Grouped';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { leaveFeedback } from '../../data';
import { useTheme } from '../../theme';

// S25 leave a review after a completed order
export default function FeedbackScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true); setError(null);
    try { await leaveFeedback(id, stars, body); router.back(); } catch { setError(tr('common.error')); } finally { setBusy(false); }
  }

  return (
    <Screen grouped footer={<Button full size="lg" label={tr('feedback.submit')} onPress={send} disabled={!stars} loading={busy} testID="send-feedback" />}>
      <Stack.Screen options={{ title: tr('feedback.title') }} />
      <Section>
        <Text weight="600" center style={{ marginTop: t.space[2] }}>{tr('feedback.how')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space[2], paddingVertical: t.space[4] }} accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: 5, now: stars }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} testID={`star-${n}`} accessibilityRole="button" accessibilityLabel={`${n} / 5`} accessibilityState={{ selected: n <= stars }} onPress={() => setStars(n)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Star size={34} color={t.c.text} fill={n <= stars ? t.c.text : 'transparent'} />
            </Pressable>
          ))}
        </View>
      </Section>
      <Section>
        <Field label={tr('feedback.comment')} value={body} onChangeText={setBody} multiline maxLength={1000} />
        {error ? <Text variant="xs" color="danger">{error}</Text> : null}
      </Section>
    </Screen>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { Section } from '../components/Grouped';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { report } from '../data';
import { useTheme } from '../theme';

const REASONS = ['fake', 'forbidden', 'scam', 'offensive', 'spam', 'other'] as const;

// S32 report an item, a member or a message
export default function Report() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { type, id } = useLocalSearchParams<{ type: 'item' | 'user' | 'message'; id: string }>();
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) return;
    setBusy(true);
    try { await report({ type, id }, reason, details); setDone(true); } finally { setBusy(false); }
  }

  return (
    <Screen grouped footer={done
      ? <Button full size="lg" label={tr('common.close')} onPress={() => router.back()} />
      : <Button full size="lg" label={tr('report.submit')} onPress={send} disabled={!reason} loading={busy} testID="send-report" />}>
      <Stack.Screen options={{ title: tr('report.title') }} />
      {done ? (
        <Section><Text style={{ paddingVertical: t.space[4] }}>{tr('report.thanks')}</Text></Section>
      ) : (
        <>
          <Section title={tr('report.why')}>
            {REASONS.map((r) => <Choice key={r} title={tr(`report.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} />)}
          </Section>
          <Section>
            <Field label={tr('report.details')} value={details} onChangeText={setDetails} multiline maxLength={1000} />
          </Section>
        </>
      )}
    </Screen>
  );
}

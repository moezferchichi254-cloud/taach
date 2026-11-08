import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Note } from '../components/Bits';
import { Button } from '../components/Button';
import { Section } from '../components/Grouped';
import { PhotoPicker } from '../components/PhotoPicker';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { devApproveId, selectIdVerification, selectMe, submitIdVerification, useStore } from '../data/fake';
import type { Photo } from '../data/types';
import { useTheme } from '../theme';

// S27 identity check (CIN) before the first payout
export default function VerifyId() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const me = useStore(selectMe);
  const v = useStore(selectIdVerification);
  const [front, setFront] = useState<Photo[]>([]);
  const [back, setBack] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = me?.idVerified ? 'approved' : v?.status;

  async function send() {
    setError(null);
    if (!front[0] || !back[0]) return setError(tr('verify.both'));
    setBusy(true);
    try { await submitIdVerification(front[0], back[0]); } catch { setError(tr('common.error')); } finally { setBusy(false); }
  }

  return (
    <Screen grouped footer={status === 'pending'
      ? <Button full variant="secondary" label={tr('verify.devApprove')} onPress={devApproveId} testID="dev-approve" />
      : status === 'approved' ? null
      : <Button full size="lg" label={tr('verify.submit')} onPress={send} loading={busy} testID="send-id" />}>
      <Stack.Screen options={{ title: tr('verify.title') }} />
      <View style={{ padding: t.layout['screen-padding'], paddingBottom: 0 }}>
        {status === 'approved' ? <Note body={tr('verify.approved')} tone="success-bg" />
          : status === 'pending' ? <Note body={tr('verify.pending')} tone="warning-bg" />
          : status === 'rejected' ? <Note body={tr('verify.rejected')} tone="danger-bg" />
          : <Note body={tr('verify.body')} />}
      </View>
      {!status || status === 'rejected' ? (
        <>
          <Section title={tr('verify.front')}><PhotoPicker photos={front} onChange={(v) => { setFront(v); setError(null); }} max={1} label={tr('verify.front')} testID="id-front" /></Section>
          <Section title={tr('verify.back')}><PhotoPicker photos={back} onChange={(v) => { setBack(v); setError(null); }} max={1} label={tr('verify.back')} testID="id-back" /></Section>
          {error ? <Text variant="sm" color="danger" style={{ padding: t.layout['screen-padding'] }}>{error}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

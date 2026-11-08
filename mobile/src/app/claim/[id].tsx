import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Choice } from '../../components/Choice';
import { Field } from '../../components/Field';
import { Section } from '../../components/Grouped';
import { PhotoPicker } from '../../components/PhotoPicker';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ApiError, openClaim, selectOrder, useStore } from '../../data/fake';
import type { ClaimReason, Photo } from '../../data/types';
import { useTheme } from '../../theme';

const REASONS: ClaimReason[] = ['not_received', 'damaged', 'not_as_described', 'counterfeit', 'other'];

// S24 report a problem with an order
export default function Claim() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useStore(selectOrder(id), id);
  const [reason, setReason] = useState<ClaimReason | null>(null);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (!order) return null;
  const shippedOnly = order.status === 'shipped';
  const reasons = shippedOnly ? (['not_received'] as ClaimReason[]) : REASONS;

  async function send() {
    setError(null);
    if (!reason) return;
    if (text.trim().length < 10) return setError(tr('claim.tooShort'));
    setBusy(true);
    try { await openClaim(order!.id, reason, text, photos); setDone(true); }
    catch (e) { setError(e instanceof ApiError && e.message === 'claim_window_closed' ? tr('claim.closed') : tr('common.error')); }
    finally { setBusy(false); }
  }

  return (
    <Screen grouped footer={done
      ? <Button full size="lg" label={tr('common.close')} onPress={() => router.back()} />
      : <Button full size="lg" label={tr('claim.submit')} onPress={send} disabled={!reason} loading={busy} testID="send-claim" />}>
      <Stack.Screen options={{ title: tr('claim.title') }} />
      {done ? (
        <Section><Text style={{ paddingVertical: t.space[4] }}>{tr('claim.sent')}</Text></Section>
      ) : (
        <>
          <Section title={tr('claim.reason')}>
            {reasons.map((r) => <Choice key={r} title={tr(`claim.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} testID={`reason-${r}`} />)}
          </Section>
          <Section style={{ gap: t.space[3] }}>
            <Field label={tr('claim.describe')} value={text} onChangeText={setText} multiline maxLength={2000} error={error} testID="claim-text" />
            <Text variant="xs" weight="600" color="text-muted">{tr('claim.photos')}</Text>
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </Section>
        </>
      )}
    </Screen>
  );
}

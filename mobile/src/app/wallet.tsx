import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Note } from '../components/Bits';
import { Button } from '../components/Button';
import { NavRow, Section } from '../components/Grouped';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import {
  devReconcileCod, requestPayout, selectLedger, selectMe, selectPayoutMethods, selectPayouts, selectWallet, useStore,
} from '../data/fake';
import { formatTND } from '../lib/money';
import { shortTime } from '../lib/time';
import { useTheme } from '../theme';

// S26 balance and withdrawals
export default function Wallet() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const me = useStore(selectMe);
  const w = useStore(selectWallet);
  const ledger = useStore(selectLedger);
  const methods = useStore(selectPayoutMethods);
  const payouts = useStore(selectPayouts);
  const orders = useStore((s) => s.orders);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lang = i18n.language;
  const money = (m: number) => formatTND(m, lang, { exact: true });
  const method = methods[0];
  const canWithdraw = !!me?.idVerified && !!method && w.availableMillimes > 0;

  async function withdraw() {
    setBusy(true); setMsg(null);
    try { await requestPayout(w.availableMillimes); setMsg(tr('wallet.requested')); } catch { setMsg(tr('common.error')); } finally { setBusy(false); }
  }

  return (
    <Screen grouped footer={
      <>
        {msg ? <Text variant="sm" center color="success">{msg}</Text> : null}
        <Button full size="lg" label={tr('wallet.withdraw', { amount: money(w.availableMillimes) })} disabled={!canWithdraw} onPress={withdraw} loading={busy} testID="withdraw" />
      </>
    }>
      <Stack.Screen options={{ title: tr('wallet.title') }} />
      <Section>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="xs" color="text-muted">{tr('wallet.available')}</Text>
            <Text variant="2xl" testID="available">{money(w.availableMillimes)}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="xs" color="text-muted">{tr('wallet.pending')}</Text>
            <Text variant="xl" color="text-muted">{money(w.pendingMillimes)}</Text>
          </View>
        </View>
        {w.pendingMillimes > 0 ? (
          <View style={{ marginTop: t.space[3], gap: t.space[2] }}>
            <Text variant="xs" color="text-muted">{tr('wallet.pendingHint')}</Text>
            <Button label={tr('wallet.devReconcile')} variant="secondary" size="sm" onPress={devReconcileCod} testID="dev-reconcile" />
          </View>
        ) : null}
      </Section>

      {!me?.idVerified ? <View style={{ padding: t.layout['screen-padding'], paddingBottom: 0 }}><Note body={tr('wallet.needId')} tone="warning-bg" /></View> : null}
      <Section flush>
        <NavRow label={tr('verify.title')} value={me?.idVerified ? tr('verify.approved') : null} onPress={() => router.push('/verify-id')} />
        <NavRow label={tr('wallet.method')} value={method ? `${tr(`wallet.kinds.${method.kind}`)} ···${method.accountRef.slice(-4)}` : tr('wallet.addMethod')} onPress={() => router.push('/settings?section=payout')} last />
      </Section>

      <Section title={tr('wallet.history')}>
        {ledger.length === 0 ? <Text variant="sm" color="text-muted">{tr('wallet.empty')}</Text> : null}
        {ledger.map((l) => {
          const o = orders.find((x) => x.id === l.orderId);
          const p = payouts.find((x) => x.id === l.payoutId);
          return (
            <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2], paddingVertical: t.space[2], borderBottomWidth: 1, borderBottomColor: t.c.border }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="sm">{l.kind === 'sale' ? tr('wallet.sale', { number: o?.number ?? '' }) : tr('wallet.payout')}</Text>
                <Text variant="xs" color="text-muted">{p ? tr(`wallet.payoutStatus.${p.status}`) : l.state === 'pending' ? tr('wallet.pending') : tr('wallet.available')}{p ? ` · ${shortTime(p.requestedAt, lang)}` : ''}</Text>
              </View>
              {l.state === 'pending' ? <Badge label={tr('wallet.pending')} tone="warning" /> : null}
              <Text variant="sm" weight="700" color={l.amountMillimes < 0 ? 'text-muted' : 'text'}>{l.amountMillimes > 0 ? '+' : ''}{money(l.amountMillimes)}</Text>
            </View>
          );
        })}
      </Section>
    </Screen>
  );
}

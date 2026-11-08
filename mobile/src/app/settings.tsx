import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import { Toggle } from '../components/Toggle';
import { Chip } from '../components/Bits';
import { Button } from '../components/Button';
import { confirm } from '../components/Confirm';
import { Field } from '../components/Field';
import { Section } from '../components/Grouped';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import {
  ApiError, deleteAccount, saveAddress, savePayoutMethod, selectBundleDiscounts, selectMe, selectMyAddress, selectPayoutMethods,
  setBundleDiscounts, updateProfile, useStore,
} from '../data';
import type { PayoutMethod } from '../data/types';
import { GOVERNORATES } from '../lib/governorates';
import { useTheme } from '../theme';

function GovernoratePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: t.space[2] }}>
      {GOVERNORATES.map((g) => <Chip key={g} label={g} selected={value === g} onPress={() => onChange(g)} />)}
    </ScrollView>
  );
}

// S28 settings
export default function Settings() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const me = useStore(selectMe);
  const addr = useStore(selectMyAddress);
  const methods = useStore(selectPayoutMethods);
  const tiers = useStore(selectBundleDiscounts(me?.id ?? ''), me?.id ?? '');
  const [profile, setProfile] = useState({ displayName: me?.displayName ?? '', bio: me?.bio ?? '', city: me?.city ?? '', governorate: me?.governorate ?? '' });
  const [a, setA] = useState({ fullName: addr?.fullName ?? '', phone: addr?.phone ?? '', line1: addr?.line1 ?? '', city: addr?.city ?? '', governorate: addr?.governorate ?? '', postcode: addr?.postcode ?? '' });
  const m0 = methods[0];
  const [pm, setPm] = useState<{ kind: PayoutMethod['kind']; holderName: string; accountRef: string }>({ kind: m0?.kind ?? 'bank_rib', holderName: m0?.holderName ?? '', accountRef: m0?.accountRef ?? '' });
  const [b2, setB2] = useState(String(tiers.find((x) => x.minItems === 2)?.percent ?? ''));
  const [b3, setB3] = useState(String(tiers.find((x) => x.minItems === 3)?.percent ?? ''));
  const [status, setStatus] = useState<Record<string, string>>({});
  if (!me) return null;

  const save = (key: string, fn: () => Promise<unknown>) => async () => {
    setStatus((s) => ({ ...s, [key]: '' }));
    try { await fn(); setStatus((s) => ({ ...s, [key]: tr('settings.saved') })); }
    catch (e) {
      const code = e instanceof ApiError ? e.message : '';
      const msg = key === 'payout' && ['holder', 'rib', 'wallet_phone'].includes(code) ? tr(`wallet.errors.${code}`) : tr('settings.invalid');
      setStatus((s) => ({ ...s, [key]: `!${msg}` }));
    }
  };
  const Msg = ({ k }: { k: string }) => status[k] ? <Text variant="xs" color={status[k].startsWith('!') ? 'danger' : 'success'}>{status[k].replace(/^!/, '')}</Text> : null;
  const tiersToSave = () => [[2, b2], [3, b3]].filter(([, v]) => String(v).trim()).map(([n, v]) => ({ minItems: Number(n), percent: Number(v) }));

  async function remove() {
    if (!(await confirm(tr('settings.deleteConfirm'), tr('settings.delete'), tr('common.cancel')))) return;
    try { await deleteAccount(); router.replace('/sign-in'); } catch { setStatus((s) => ({ ...s, delete: `!${tr('settings.deleteOpenOrders')}` })); }
  }

  return (
    <Screen grouped>
      <Stack.Screen options={{ title: tr('settings.title') }} />
      <Section title={tr('settings.profile')} style={{ gap: t.space[3] }}>
        <Field label={tr('settings.name')} value={profile.displayName} onChangeText={(v) => setProfile({ ...profile, displayName: v })} />
        <Field label={tr('settings.bio')} value={profile.bio} onChangeText={(v) => setProfile({ ...profile, bio: v })} multiline maxLength={500} />
        <Field label={tr('settings.city')} value={profile.city} onChangeText={(v) => setProfile({ ...profile, city: v })} />
        <Text variant="xs" color="text-muted">{tr('settings.governorate')}</Text>
        <GovernoratePicker value={profile.governorate} onChange={(g) => setProfile({ ...profile, governorate: g })} />
        <Msg k="profile" />
        <Button label={tr('common.save')} size="sm" onPress={save('profile', () => updateProfile(profile))} />
      </Section>

      <Section title={tr('settings.address')} style={{ gap: t.space[3] }}>
        <Field label={tr('settings.fullName')} value={a.fullName} onChangeText={(v) => setA({ ...a, fullName: v })} autoComplete="name" />
        <Field label={tr('settings.phone')} value={a.phone} onChangeText={(v) => setA({ ...a, phone: v })} keyboardType="phone-pad" autoComplete="tel" />
        <Field label={tr('settings.line1')} value={a.line1} onChangeText={(v) => setA({ ...a, line1: v })} autoComplete="street-address" />
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Field style={{ flex: 1 }} label={tr('settings.postcode')} value={a.postcode} onChangeText={(v) => setA({ ...a, postcode: v })} keyboardType="number-pad" maxLength={4} />
          <Field style={{ flex: 2 }} label={tr('settings.city')} value={a.city} onChangeText={(v) => setA({ ...a, city: v })} />
        </View>
        <GovernoratePicker value={a.governorate} onChange={(g) => setA({ ...a, governorate: g })} />
        <Msg k="address" />
        <Button label={tr('common.save')} size="sm" onPress={save('address', () => saveAddress(a))} />
      </Section>

      <Section title={tr('wallet.method')} style={{ gap: t.space[3] }}>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          {(['bank_rib', 'd17', 'flouci_wallet'] as const).map((k) => <Chip key={k} label={tr(`wallet.kinds.${k}`)} selected={pm.kind === k} onPress={() => setPm({ ...pm, kind: k })} />)}
        </View>
        <Field label={tr('wallet.holder')} value={pm.holderName} onChangeText={(v) => setPm({ ...pm, holderName: v })} testID="holder" />
        <Field label={pm.kind === 'bank_rib' ? tr('wallet.rib') : tr('wallet.walletPhone')} value={pm.accountRef} onChangeText={(v) => setPm({ ...pm, accountRef: v })} keyboardType="number-pad" testID="account-ref" />
        <Msg k="payout" />
        <Button label={tr('wallet.save')} size="sm" onPress={save('payout', () => savePayoutMethod(pm.kind, pm.holderName, pm.accountRef))} testID="save-payout" />
      </Section>

      <Section title={tr('settings.bundle')} style={{ gap: t.space[3] }}>
        <Text variant="xs" color="text-muted">{tr('settings.bundleHint')}</Text>
        <View style={{ flexDirection: 'row', gap: t.space[3] }}>
          <Field style={{ flex: 1 }} label={tr('settings.bundle2')} value={b2} onChangeText={setB2} keyboardType="number-pad" maxLength={2} />
          <Field style={{ flex: 1 }} label={tr('settings.bundle3')} value={b3} onChangeText={setB3} keyboardType="number-pad" maxLength={2} />
        </View>
        <Msg k="bundle" />
        <Button label={tr('common.save')} size="sm" onPress={save('bundle', () => setBundleDiscounts(tiersToSave()))} />
      </Section>

      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <View style={{ flex: 1 }}>
            <Text>{tr('settings.holiday')}</Text>
            <Text variant="xs" color="text-muted">{tr('settings.holidayHint')}</Text>
          </View>
          <Toggle value={!!me.holidayMode} onChange={(v) => updateProfile({ holidayMode: v })} label={tr('settings.holiday')} />
        </View>
      </Section>

      <Section title={tr('settings.language')}>
        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          <Chip label="Français" selected={i18n.language === 'fr'} onPress={() => i18n.changeLanguage('fr')} />
          <Chip label="English" selected={i18n.language === 'en'} onPress={() => i18n.changeLanguage('en')} />
        </View>
      </Section>

      <Section style={{ gap: t.space[2] }}>
        <Msg k="delete" />
        <Button label={tr('settings.delete')} variant="danger" size="sm" onPress={remove} testID="delete-account" />
      </Section>
    </Screen>
  );
}

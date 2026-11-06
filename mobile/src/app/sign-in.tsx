import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Text } from '../components/Text';
import { signInWithPhone } from '../data/fake';
import { useTheme } from '../theme';

// S01: phone number + SMS code. Demo: any 4-digit code works.
export default function SignIn() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const digits = phone.replace(/\D/g, '');
  async function next() {
    setError(null);
    if (step === 'phone') {
      if (digits.length !== 8) return setError(tr('auth.invalidPhone'));
      return setStep('code');
    }
    if (!/^\d{4}$/.test(code)) return setError(tr('auth.invalidCode'));
    setBusy(true);
    try { await signInWithPhone('+216' + digits, code); } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.c.bg }}>
      <View style={{ flex: 1, padding: t.layout['screen-padding'], paddingTop: insets.top + t.space[8], gap: t.space[4] }}>
        <Text variant="2xl" style={{ fontFamily: 'serif' }}>taach</Text>
        <Text variant="xl">{tr('auth.title')}</Text>
        <Text color="text-muted">{tr('auth.subtitle')}</Text>
        <View style={{ gap: t.space[3], marginTop: t.space[5] }}>
          <Field
            label={`${tr('auth.phone')} (+216)`}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="20 123 456"
            editable={step === 'phone'}
            error={step === 'phone' ? error : null}
            testID="phone"
          />
          {step === 'code' ? (
            <>
              <Field label={tr('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={4} error={error} autoFocus testID="code" />
              <Text variant="xs" color="text-muted">{tr('auth.codeHint')}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={{ padding: t.layout['screen-padding'], paddingBottom: Math.max(insets.bottom, t.space[4]) }}>
        <Button full size="lg" label={step === 'phone' ? tr('auth.sendCode') : tr('auth.verify')} onPress={next} loading={busy} testID="auth-next" />
      </View>
    </KeyboardAvoidingView>
  );
}

import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Avatar, Chip, Stars } from '../../components/Bits';
import { InfoRow, NavRow, Section } from '../../components/Grouped';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { selectMe, selectWallet, signInAs, signOut, useStore } from '../../data/fake';
import { formatTND } from '../../lib/money';
import { useTheme } from '../../theme';

// S07 (own) + links to orders, wallet, settings. Includes the demo account switch.
export default function Profile() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const me = useStore(selectMe);
  const wallet = useStore(selectWallet);
  const profiles = useStore((s) => s.profiles);
  if (!me) return null;
  const money = (m: number) => formatTND(m, i18n.language, { exact: true });

  return (
    <Screen grouped>
      <Section>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}>
          <Avatar name={me.displayName} size={56} />
          <View style={{ gap: 2 }}>
            <Text variant="lg">{me.username}</Text>
            <Stars value={me.ratingAvg} count={me.ratingCount} />
            <Text variant="xs" color="text-muted">{me.city}, {me.governorate}</Text>
          </View>
        </View>
      </Section>
      <Section flush>
        <NavRow label={tr('profile.orders')} onPress={() => router.push('/orders')} />
        <NavRow label={tr('profile.favourites')} onPress={() => router.push('/favourites')} />
        <NavRow label={tr('profile.wardrobe')} onPress={() => router.push(`/member/${me.id}`)} />
        <NavRow label={tr('profile.settings')} onPress={() => router.push('/settings')} last />
      </Section>
      <Section title={tr('profile.wallet')}>
        <InfoRow label={tr('profile.pending')} value={money(wallet.pendingMillimes)} />
        <InfoRow label={tr('profile.available')} value={money(wallet.availableMillimes)} />
      </Section>
      <Section title={tr('profile.language')}>
        <View style={{ flexDirection: 'row', gap: t.space[2] }}>
          <Chip label="Français" selected={i18n.language === 'fr'} onPress={() => i18n.changeLanguage('fr')} />
          <Chip label="English" selected={i18n.language === 'en'} onPress={() => i18n.changeLanguage('en')} />
        </View>
      </Section>
      <Section title={tr('profile.demoUser')}>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          {profiles.map((p) => <Chip key={p.id} label={p.displayName} selected={p.id === me.id} onPress={() => signInAs(p.id)} />)}
        </View>
      </Section>
      <Section flush>
        <NavRow label={tr('profile.design')} onPress={() => router.push('/design')} />
        <NavRow label={tr('profile.signOut')} onPress={signOut} last />
      </Section>
    </Screen>
  );
}

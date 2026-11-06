import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Chip, Note, Stars } from '../components/Bits';
import { Button } from '../components/Button';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { InfoRow, NavRow, Section } from '../components/Grouped';
import { ItemCard } from '../components/ItemCard';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { Timeline } from '../components/Timeline';
import { selectFeed, useStore } from '../data/fake';
import { useTheme } from '../theme';

// Hidden page: every primitive in isolation (the design system check).
export default function Design() {
  const t = useTheme();
  const items = useStore(selectFeed);
  const [sel, setSel] = useState(true);
  return (
    <Screen grouped>
      <Stack.Screen options={{ title: 'Design system' }} />
      <Section title="Text">
        <Text variant="2xl">2xl titre</Text><Text variant="xl">xl titre</Text><Text variant="lg">lg section</Text>
        <Text>base texte</Text><Text variant="sm" color="text-muted">sm muted</Text><Text variant="xs">xs légende</Text>
      </Section>
      <Section title="Buttons" style={{ gap: t.space[2] }}>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          <Button label="Acheter" /><Button label="Faire une offre" variant="secondary" /><Button label="Annuler" variant="ghost" />
        </View>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          <Button label="Supprimer" variant="danger" /><Button label="Désactivé" disabled /><Button label="Envoi" loading /><Button label="Message" variant="secondary" size="sm" />
        </View>
      </Section>
      <Section title="Chips & badges" style={{ gap: t.space[2] }}>
        <View style={{ flexDirection: 'row', gap: t.space[2] }}><Chip label="Tout" selected /><Chip label="Vintage" /><Chip label="Maison" /></View>
        <View style={{ flexDirection: 'row', gap: t.space[2], flexWrap: 'wrap' }}>
          <Badge label="Vintage · 1980s" tone="vintage" /><Badge label="Terminé" tone="success" /><Badge label="À expédier" tone="warning" /><Badge label="Litige" tone="danger" /><Badge label="Vendu" />
        </View>
        <View style={{ flexDirection: 'row', gap: t.space[3], alignItems: 'center' }}><Avatar name="Amira" /><Stars value={4.6} count={38} /></View>
      </Section>
      <Section title="Fields" style={{ gap: t.space[3] }}>
        <Field label="Titre" value="Veste en cuir années 80" onChangeText={() => {}} />
        <Field label="Prix (DT)" value="0,5" onChangeText={() => {}} error="Prix minimum : 1 DT." />
      </Section>
      <Section flush><NavRow label="Catégorie" value="Femme" /><NavRow label="État" last /></Section>
      <Section title="Choice"><Choice title="Livreur à domicile" body="Le livreur récupère le colis chez le vendeur." selected={sel} onPress={() => setSel(true)} /><Choice title="Remise en main propre" selected={!sel} onPress={() => setSel(false)} /></Section>
      <Section title="Summary"><InfoRow label="Article" value="85,000 DT" /><InfoRow strong label="Total" value="97,750 DT" /></Section>
      <Section title="Note"><Note title="Achat protégé." body="Ton argent n’est versé au vendeur qu’après ta confirmation." /></Section>
      <Section title="Timeline"><Timeline status="shipped" /></Section>
      <Section title="Item cards">
        <View style={{ flexDirection: 'row', gap: t.layout['grid-gap'] }}>{items.slice(0, 2).map((i) => <View key={i.id} style={{ flex: 1 }}><ItemCard item={i} /></View>)}</View>
      </Section>
    </Screen>
  );
}

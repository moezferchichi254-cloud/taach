import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Send, ShieldAlert, UserRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { OfferCard } from '../../components/OfferCard';
import { Photo } from '../../components/Photo';
import { Text } from '../../components/Text';
import {
  markConversationRead, selectConversation, selectIsBlocked, selectItem, selectMe, selectMessages, selectProfile, sendMessage, useStore,
} from '../../data/fake';
import type { Message } from '../../data/types';
import { formatTND } from '../../lib/money';
import { shortTime } from '../../lib/time';
import { useTheme } from '../../theme';

// S15 conversation
export default function ConversationScreen() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useStore(selectConversation(id), id);
  const me = useStore(selectMe);
  const messages = useStore(selectMessages(id), id);
  const item = useStore(selectItem(c?.itemId ?? ''), c?.itemId ?? '');
  const otherId = c ? (c.buyerId === me?.id ? c.sellerId : c.buyerId) : '';
  const other = useStore(selectProfile(otherId), otherId);
  const blocked = useStore((s) => !!c && s.blocks.some((b) => (b.blockerId === c.buyerId && b.blockedId === c.sellerId) || (b.blockerId === c.sellerId && b.blockedId === c.buyerId)), c?.id ?? '');
  const iBlocked = useStore(selectIsBlocked(otherId), otherId);
  const [text, setText] = useState('');
  const list = useRef<FlatList<Message>>(null);
  const lang = i18n.language;

  useEffect(() => { if (c) markConversationRead(c.id); }, [c?.id, messages.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || !me) return null;
  const iAmBuyer = c.buyerId === me.id;

  async function send() {
    const body = text;
    setText('');
    await sendMessage(c!.id, body);
    setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={{ flex: 1, backgroundColor: t.c.bg }}>
      <Stack.Screen options={{ title: other?.username ?? '', headerRight: () => (
        <Pressable accessibilityRole="link" accessibilityLabel={other?.username ?? ''} hitSlop={10} onPress={() => router.push(`/member/${otherId}`)} style={{ paddingHorizontal: t.space[3] }}>
          <UserRound size={22} color={t.c.text} />
        </Pressable>
      ) }} />
      {item ? (
        <Pressable accessibilityRole="link" onPress={() => router.push(`/item/${item.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.space[3], paddingHorizontal: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border }}>
          <Photo photo={item.photos[0]} label={item.title} style={{ width: 40, height: 50, borderRadius: t.radius.sm }} />
          <View style={{ flex: 1 }}>
            <Text variant="sm" numberOfLines={1}>{item.title}</Text>
            <Text variant="sm" weight="700">{item.status === 'active' ? formatTND(item.priceMillimes, lang) : tr('chat.itemGone')}</Text>
          </View>
          {iAmBuyer && item.status === 'active' ? (
            <View style={{ flexDirection: 'row', gap: t.space[2] }}>
              <Button label={tr('item.offer')} size="sm" variant="secondary" onPress={() => router.push(`/offer/${item.id}`)} />
              <Button label={tr('item.buy')} size="sm" onPress={() => router.push(`/checkout/${item.id}`)} />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: t.layout['screen-padding'], gap: t.space[2], flexGrow: 1, justifyContent: 'flex-end' }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: m }) => {
          if (m.kind === 'offer' && m.offerId) return <OfferCard offerId={m.offerId} conversation={c} />;
          if (m.kind === 'system') return <Text variant="xs" color="text-muted" center style={{ marginVertical: t.space[1] }}>{tr(`chat.system.${m.body}`)}</Text>;
          const mine = m.senderId === me.id;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%', gap: 2 }}>
              <View style={{ backgroundColor: mine ? t.c.accent : t.c.surface, paddingHorizontal: t.space[3] + 2, paddingVertical: t.space[2] + 2, borderRadius: t.radius.lg }}>
                <Text variant="sm" style={{ color: mine ? t.c['on-accent'] : t.c.text }}>{m.body}</Text>
              </View>
              <Text variant="xs" color="text-muted" style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}>{shortTime(m.createdAt, lang)}</Text>
              {m.flagged ? (
                <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: t.c['warning-bg'], borderRadius: t.radius.sm, padding: t.space[2] }}>
                  <ShieldAlert size={14} color={t.c.warning} />
                  <Text variant="xs" color="warning" style={{ flexShrink: 1 }}>{tr('chat.flagged')}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {blocked || iBlocked ? (
        <Text variant="sm" color="text-muted" center style={{ padding: t.space[4] }}>{tr('chat.blocked')}</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.space[2], padding: t.space[2], paddingHorizontal: t.layout['screen-padding'], paddingBottom: Math.max(insets.bottom, t.space[2]), borderTopWidth: 1, borderTopColor: t.c.border }}>
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder={tr('chat.placeholder')}
            placeholderTextColor={t.c['text-muted']}
            multiline
            maxLength={2000}
            accessibilityLabel={tr('chat.placeholder')}
            style={[t.type('base'), { flex: 1, color: t.c.text, backgroundColor: t.c.surface, borderRadius: t.radius.lg, paddingHorizontal: t.space[3], paddingVertical: t.space[2], maxHeight: 120 }]}
          />
          <Pressable testID="chat-send" accessibilityRole="button" accessibilityLabel={tr('chat.send')} disabled={!text.trim()} onPress={send}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.c.accent, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
            <Send size={20} color={t.c['on-accent']} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

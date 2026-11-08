import { router } from 'expo-router';
import { Bell, MessageCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { Avatar, Badge, Chip } from '../../components/Bits';
import { Empty } from '../../components/Empty';
import { Photo } from '../../components/Photo';
import { Text } from '../../components/Text';
import {
  markNotificationsRead, selectConversations, selectLastMessage, selectMe, selectNotifications, selectProfile, useStore,
} from '../../data/fake';
import type { Conversation } from '../../data/types';
import { shortTime } from '../../lib/time';
import { useTheme } from '../../theme';

function ConversationRow({ c }: { c: Conversation }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const me = useStore(selectMe);
  const otherId = c.buyerId === me?.id ? c.sellerId : c.buyerId;
  const other = useStore(selectProfile(otherId), otherId);
  const item = useStore((s) => s.items.find((i) => i.id === c.itemId), c.itemId);
  const last = useStore(selectLastMessage(c.id), c.id);
  const pendingOffer = useStore((s) => s.offers.some((o) => o.conversationId === c.id && o.status === 'pending'), c.id);
  const readAt = c.buyerId === me?.id ? c.buyerReadAt : c.sellerReadAt;
  const unread = !!last && last.senderId !== me?.id && (!readAt || last.createdAt > readAt);
  const preview = !last ? '' : last.kind === 'offer' ? (last.senderId === me?.id ? tr('chat.yourOffer') : tr('chat.offerFrom', { name: other?.username ?? '' })) : last.kind === 'system' ? tr(`chat.system.${last.body}`) : `${last.senderId === me?.id ? tr('inbox.you') : ''}${last.body}`;
  return (
      <Pressable accessibilityRole="link" accessibilityLabel={`${other?.username ?? ''}, ${preview}`} onPress={() => router.push(`/conversation/${c.id}`)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: pressed ? t.c.surface : t.c.bg })}>
        <Avatar name={other?.displayName ?? '?'} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space[2] }}>
            <Text weight={unread ? '700' : '600'} numberOfLines={1} style={{ flexShrink: 1 }}>{other?.username}</Text>
            {unread ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.c.accent }} /> : null}
            <Text variant="xs" color="text-muted" style={{ marginStart: 'auto' }}>{shortTime(c.lastMessageAt, i18n.language)}</Text>
          </View>
          <Text variant="sm" color={unread ? 'text' : 'text-muted'} numberOfLines={1}>{preview}</Text>
          {pendingOffer ? <Badge label={tr('inbox.offerPending')} tone="warning" /> : null}
        </View>
        {item ? <Photo photo={item.photos[0]} label={item.title} style={{ width: 44, height: 56, borderRadius: t.radius.sm }} /> : null}
      </Pressable>
  );
}

function Notifications() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const list = useStore(selectNotifications);
  useEffect(() => () => markNotificationsRead(), []);
  return (
    <FlatList
      data={list}
      keyExtractor={(n) => n.id}
      ListEmptyComponent={<Empty icon={<Bell size={32} color={t.c['text-muted']} />} title={tr('inbox.noNotifications')} />}
      renderItem={({ item: n }) => (
        <Pressable accessibilityRole={n.href ? 'link' : undefined} disabled={!n.href} onPress={() => n.href && router.push(n.href as never)}
          style={({ pressed }) => ({ flexDirection: 'row', gap: t.space[3], padding: t.layout['screen-padding'], borderBottomWidth: 1, borderBottomColor: t.c.border, backgroundColor: pressed ? t.c.surface : n.readAt ? t.c.bg : t.c.surface })}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="sm" weight={n.readAt ? '400' : '600'}>{i18n.language === 'en' ? n.text.en : n.text.fr}</Text>
            <Text variant="xs" color="text-muted">{shortTime(n.createdAt, i18n.language)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

// S14 inbox (+ S29 notifications)
export default function Inbox() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [tab, setTab] = useState<'messages' | 'notifications'>('messages');
  const convs = useStore(selectConversations);
  const unreadNotifs = useStore((s) => s.notifications.filter((n) => n.userId === s.me && !n.readAt).length);
  return (
    <View style={{ flex: 1, backgroundColor: t.c.bg }}>
      <View style={{ flexDirection: 'row', gap: t.space[2], padding: t.layout['screen-padding'], paddingTop: t.space[2] }}>
        <Chip label={tr('inbox.messages')} selected={tab === 'messages'} onPress={() => setTab('messages')} />
        <Chip label={`${tr('inbox.notifications')}${unreadNotifs ? ` (${unreadNotifs})` : ''}`} selected={tab === 'notifications'} onPress={() => setTab('notifications')} />
      </View>
      {tab === 'messages' ? (
        <FlatList
          data={convs}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow c={item} />}
          ListEmptyComponent={<Empty icon={<MessageCircle size={32} color={t.c['text-muted']} />} title={tr('inbox.empty')} body={tr('inbox.emptyBody')} />}
        />
      ) : <Notifications />}
    </View>
  );
}

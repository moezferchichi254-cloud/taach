import { Tabs } from 'expo-router/js-tabs';
import { Home, MessageCircle, Plus, Search, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { selectUnreadCount, useStore } from '../../data/fake';
import { useTheme } from '../../theme';

export default function TabLayout() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const unread = useStore(selectUnreadCount);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: t.c.bg },
        headerTintColor: t.c.text,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        tabBarActiveTintColor: t.c.text,
        tabBarInactiveTintColor: t.c['text-muted'],
        tabBarStyle: { backgroundColor: t.c.bg, borderTopColor: t.c.border },
        tabBarLabelStyle: { fontSize: 11 },
        sceneStyle: { backgroundColor: t.c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: tr('tabs.home'), headerShown: false, tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: tr('tabs.search'), headerShown: false, tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tabs.Screen
        name="sell"
        options={{
          title: tr('tabs.sell'),
          tabBarIcon: () => (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Plus color={t.c['on-accent']} size={22} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="inbox" options={{ title: tr('tabs.inbox'), tabBarBadge: unread || undefined, tabBarBadgeStyle: { backgroundColor: t.c.danger, color: t.c['on-danger'], fontSize: 11 }, tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: tr('tabs.profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}

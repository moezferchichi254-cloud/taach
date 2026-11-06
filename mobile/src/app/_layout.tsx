import '../i18n';
import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { selectMe, useStore } from '../data/fake';
import { ThemeRoot, useTheme } from '../theme';

function Nav() {
  const t = useTheme();
  const me = useStore(selectMe);
  const segments = useSegments();
  const onSignIn = segments[0] === 'sign-in';
  if (!me && !onSignIn) return <Redirect href="/sign-in" />;
  if (me && onSignIn) return <Redirect href="/" />;
  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: t.c.bg },
          headerTintColor: t.c.text,
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
          headerTitleAlign: 'center',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: t.c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ headerTransparent: true, title: '' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeRoot>
        <Nav />
      </ThemeRoot>
    </SafeAreaProvider>
  );
}

import { Alert, Platform } from 'react-native';

/** Confirm a destructive or money action. Native dialog; browser confirm on web. */
export function confirm(message: string, ok: string, cancel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : true);
  return new Promise((resolve) =>
    Alert.alert('', message, [
      { text: cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

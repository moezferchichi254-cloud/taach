import { Redirect } from 'expo-router';

// S29 lives in the Inbox tab.
export default function Notifications() {
  return <Redirect href="/inbox" />;
}

/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const SCAM_ALERT_CHANNEL_ID = 'scam-alerts';

function isScamAlertPayload(data) {
  return data?.type === 'scam_alert';
}

async function showBackgroundScamAlert(data) {
  const channelId = await notifee.createChannel({
    id: SCAM_ALERT_CHANNEL_ID,
    name: 'Scam alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });

  await notifee.displayNotification({
    title: data?.title || 'SCAM DETECTED',
    body: data?.body || 'Hang up now',
    data: Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, String(value)]),
    ),
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      sound: 'default',
    },
  });
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[ScamShield][FCM background]', remoteMessage.messageId, remoteMessage.data);
  if (isScamAlertPayload(remoteMessage.data)) {
    await showBackgroundScamAlert(remoteMessage.data);
  }
  return Promise.resolve(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);

/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {
  AndroidCategory,
  AndroidColor,
  AndroidImportance,
  AndroidStyle,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

const SCAM_ALERT_CHANNEL_ID = 'scam-alerts-urgent-v2';
const SCAM_ALERT_VIBRATION_PATTERN = [1, 700, 150, 700, 150, 1000];

function isScamAlertPayload(data) {
  return data?.type === 'scam_alert';
}

async function showBackgroundScamAlert(data) {
  console.log('[ScamShield][notifee background] preparing urgent notification', data);
  const channelId = await notifee.createChannel({
    id: SCAM_ALERT_CHANNEL_ID,
    name: 'Urgent scam alerts',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: SCAM_ALERT_VIBRATION_PATTERN,
    lights: true,
    lightColor: AndroidColor.RED,
    sound: 'default',
  });

  await notifee.displayNotification({
    title: data?.title || 'SCAM DETECTED',
    subtitle: 'ScamShield urgent warning',
    body: data?.body || 'Hang up now. This call has been flagged as a high-risk scam.',
    data: Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, String(value)]),
    ),
    android: {
      channelId,
      category: AndroidCategory.ALARM,
      color: '#D90429',
      colorized: true,
      importance: AndroidImportance.HIGH,
      lights: [AndroidColor.RED, 600, 300],
      loopSound: true,
      ongoing: true,
      pressAction: { id: 'default' },
      fullScreenAction: { id: 'default' },
      sound: 'default',
      style: {
        type: AndroidStyle.BIGTEXT,
        text: 'SCAM DETECTED. Hang up now. This call has been flagged as a high-risk scam by ScamShield.',
      },
      vibrationPattern: SCAM_ALERT_VIBRATION_PATTERN,
      visibility: AndroidVisibility.PUBLIC,
    },
  });
  console.log('[ScamShield][notifee background] urgent notification displayed', channelId);
}

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[ScamShield][FCM background]', remoteMessage.messageId, remoteMessage.data);
  if (isScamAlertPayload(remoteMessage.data)) {
    try {
      await showBackgroundScamAlert(remoteMessage.data);
    } catch (error) {
      console.log('[ScamShield][notifee background] display failed', error);
    }
  }
  return Promise.resolve(remoteMessage);
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
    return;
  }

  console.log('[ScamShield][notifee background press]', detail.notification?.data);
});

AppRegistry.registerComponent(appName, () => App);

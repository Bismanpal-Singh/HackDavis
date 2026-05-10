/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[ScamShield][FCM background]', remoteMessage.messageId, remoteMessage.data);
  // Android displays notification payloads automatically in the background.
  // The app handles navigation when the user taps the notification.
  return Promise.resolve(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);

/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('@react-native-firebase/messaging', () => {
  const messagingMock = () => ({
    getToken: jest.fn().mockResolvedValue('push-token'),
    onMessage: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  });

  return messagingMock;
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({type: 'cancelled'}),
  },
}));

jest.mock('react-native-contacts', () => ({
  requestPermission: jest.fn().mockResolvedValue('authorized'),
  getAllWithoutPhotos: jest.fn().mockResolvedValue([]),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

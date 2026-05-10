import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import messaging from '@react-native-firebase/messaging';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Contacts from 'react-native-contacts';
import HapticFeedback from 'react-native-haptic-feedback';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

const TWILIO_NUMBER = '(855) 555-0199';
const BACKEND_HTTP_URL = 'https://merchandise-scope-gets-disks.trycloudflare.com';
const GOOGLE_WEB_CLIENT_ID = '622151238741-uflrd08u48mkdbicer6204ev4gk5022l.apps.googleusercontent.com';
const SETUP_COMPLETE_KEY = 'setup_complete';
const USER_REGISTERED_KEY = 'user_registered';
const GOOGLE_SUB_KEY = 'google_sub';
const USER_NAME_KEY = 'user_name';
const USER_PHONE_KEY = 'user_phone';
const TWILIO_NUMBER_KEY = 'twilio_number';
const PUSH_TOKEN_ENDPOINT = `${BACKEND_HTTP_URL}/api/push-token`;
const SCAM_ALERT_CHANNEL_ID = 'scam-alerts';

type Screen = 'account' | 'setup' | 'protected' | 'alert';
type PushStatus =
  | 'unsupported'
  | 'idle'
  | 'registering'
  | 'registered'
  | 'denied'
  | 'failed';

type ScamShieldPushModule = {
  requestPushToken: () => Promise<string>;
  consumePendingScamAlert: () => Promise<boolean>;
};

const ScamShieldPush = NativeModules.ScamShieldPush as
  | ScamShieldPushModule
  | undefined;

function isScamAlertPayload(data?: { [key: string]: unknown }) {
  return data?.type === 'scam_alert';
}

function normalizePhoneNumber(input: string) {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

function collectPhoneNumbers(contacts: Contacts.Contact[]) {
  const phoneNumbers = new Set<string>();

  contacts.forEach(contact => {
    contact.phoneNumbers?.forEach(phoneNumber => {
      const normalized = normalizePhoneNumber(phoneNumber.number ?? '');
      if (normalized) {
        phoneNumbers.add(normalized);
      }
    });
  });

  return Array.from(phoneNumbers).sort();
}

async function assertSuccessfulResponse(response: Response, action: string) {
  if (response.ok) {
    return;
  }

  const responseText = await response.text();
  const detail = responseText ? ` ${responseText}` : '';
  throw new Error(`${action} failed with status ${response.status}.${detail}`);
}

async function requestContactsPermission() {
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts permission',
        message: 'ScamShield needs your contacts to identify unknown callers.',
        buttonPositive: 'Allow',
      },
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const permission = await Contacts.requestPermission();
  return permission === 'authorized';
}

async function requestAndroidNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Notification permission',
      message: 'ScamShield needs notifications to alert you during scam calls.',
      buttonPositive: 'Allow',
    },
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  const channelId = await notifee.createChannel({
    id: SCAM_ALERT_CHANNEL_ID,
    name: 'Scam alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
  console.log('[ScamShield][notifications] channel ready', channelId);
}

async function displayScamNotification(data?: { [key: string]: unknown }) {
  if (Platform.OS !== 'android') {
    return;
  }

  console.log('[ScamShield][notifications] displaying local alert', data);
  await ensureAndroidNotificationChannel();
  await notifee.displayNotification({
    title: 'SCAM DETECTED',
    body: 'Hang up now',
    data: Object.fromEntries(
      Object.entries(data ?? {}).map(([key, value]) => [key, String(value)]),
    ),
    android: {
      channelId: SCAM_ALERT_CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      sound: 'default',
    },
  });
}

async function testSystemNotification() {
  const granted = await requestAndroidNotificationPermission();

  if (!granted) {
    Alert.alert(
      'Notifications are off',
      'Enable notifications in Android Settings, then test again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: Linking.openSettings },
      ],
    );
    return;
  }

  await displayScamNotification({
    type: 'scam_alert',
    source: 'local_test',
  });
}

function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      profileImageSize: 120,
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#07111f" />
      <ScamShieldApp />
    </SafeAreaProvider>
  );
}

function ScamShieldApp() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [isBooting, setIsBooting] = useState(true);
  const [pushStatus, setPushStatus] = useState<PushStatus>(
    Platform.OS === 'ios' ? 'idle' : 'unsupported',
  );
  const didAttemptPushRegistrationRef = useRef(false);

  const registerPushToken = useCallback(async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      setPushStatus('unsupported');
      return;
    }

    if (didAttemptPushRegistrationRef.current) {
      return;
    }

    didAttemptPushRegistrationRef.current = true;

    setPushStatus('registering');

    try {
      let token: string;
      let provider: 'apns' | 'fcm';

      if (Platform.OS === 'android') {
        const granted = await requestAndroidNotificationPermission();

        if (!granted) {
          throw new Error('notification_permission_denied');
        }

        await ensureAndroidNotificationChannel();
        token = await messaging().getToken();
        console.log('[ScamShield][FCM token]', token);
        provider = 'fcm';
      } else if (ScamShieldPush) {
        token = await ScamShieldPush.requestPushToken();
        provider = 'apns';
      } else {
        setPushStatus('unsupported');
        return;
      }

      const googleSub = await AsyncStorage.getItem(GOOGLE_SUB_KEY);

      if (!googleSub) {
        throw new Error('Google setup is required before registering push alerts.');
      }

      const response = await fetch(PUSH_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sub: googleSub,
          platform: Platform.OS,
          provider,
          token,
        }),
      });

      await assertSuccessfulResponse(response, 'Push token upload');

      console.log('[ScamShield][push upload] registered', {
        provider,
        googleSub,
      });
      setPushStatus('registered');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      console.log('[ScamShield][push upload] failed', message);
      setPushStatus(message.includes('denied') ? 'denied' : 'failed');
      didAttemptPushRegistrationRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      AsyncStorage.getItem(USER_REGISTERED_KEY),
      AsyncStorage.getItem(SETUP_COMPLETE_KEY),
    ])
      .then(([userRegistered, setupComplete]) => {
        if (!mounted) {
          return;
        }

        if (userRegistered !== 'true') {
          setScreen('account');
          return;
        }

        if (setupComplete === 'true') {
          setScreen('protected');
          registerPushToken();
          return;
        }

        setScreen('setup');
      })
      .finally(() => {
        if (mounted) {
          setIsBooting(false);
        }
      });

    let pushSubscription: { remove: () => void } | undefined;

    if (Platform.OS === 'android') {
      const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        console.log('[ScamShield][FCM foreground]', remoteMessage.messageId, remoteMessage.data);
        if (isScamAlertPayload(remoteMessage.data)) {
          await displayScamNotification(remoteMessage.data);
          setScreen('alert');
        }
      });

      const unsubscribeOpened = messaging().onNotificationOpenedApp(
        remoteMessage => {
          console.log('[ScamShield][FCM opened]', remoteMessage.messageId, remoteMessage.data);
          if (isScamAlertPayload(remoteMessage.data)) {
            setScreen('alert');
          }
        },
      );

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          console.log('[ScamShield][FCM initial]', remoteMessage?.messageId, remoteMessage?.data);
          if (mounted && isScamAlertPayload(remoteMessage?.data)) {
            setScreen('alert');
          }
        })
        .catch(() => undefined);

      const unsubscribeNotifeeForeground = notifee.onForegroundEvent(
        ({ type, detail }) => {
          if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
            return;
          }
          const data = detail.notification?.data as
            | { [key: string]: unknown }
            | undefined;
          console.log('[ScamShield][notifee press]', data);
          if (isScamAlertPayload(data)) {
            setScreen('alert');
          }
        },
      );

      notifee
        .getInitialNotification()
        .then(initial => {
          const data = initial?.notification?.data as
            | { [key: string]: unknown }
            | undefined;
          console.log('[ScamShield][notifee initial]', data);
          if (mounted && isScamAlertPayload(data)) {
            setScreen('alert');
          }
        })
        .catch(() => undefined);

      pushSubscription = {
        remove: () => {
          unsubscribeForeground();
          unsubscribeOpened();
          unsubscribeNotifeeForeground();
        },
      };
    } else if (Platform.OS === 'ios' && ScamShieldPush) {
      const emitter = new NativeEventEmitter(NativeModules.ScamShieldPush);
      pushSubscription = emitter.addListener('ScamShieldScamAlert', () => {
        setScreen('alert');
      });

      ScamShieldPush.consumePendingScamAlert()
        .then(hadPendingAlert => {
          if (mounted && hadPendingAlert) {
            setScreen('alert');
          }
        })
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
      pushSubscription?.remove();
    };
  }, [registerPushToken]);

  const navigation = useMemo(
    () => ({
      goToSetup: () => setScreen('setup'),
      goToProtected: () => setScreen('protected'),
      goToAlert: () => setScreen('alert'),
      testSystemNotification,
    }),
    [],
  );

  if (isBooting) {
    return <BootScreen />;
  }

  if (screen === 'alert') {
    return <AlertScreen onDone={navigation.goToProtected} />;
  }

  if (screen === 'protected') {
    return (
      <ProtectedScreen
        pushStatus={pushStatus}
        onEnablePush={registerPushToken}
        onBackToSetup={navigation.goToSetup}
        onTestAlert={navigation.goToAlert}
        onTestNotification={navigation.testSystemNotification}
      />
    );
  }

  if (screen === 'account') {
    return <AccountScreen onComplete={navigation.goToSetup} />;
  }

  return (
    <SetupScreen
      onReady={() => {
        navigation.goToProtected();
        registerPushToken();
      }}
    />
  );
}

function normalizeDialedPhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return input.trim();
}

function AccountScreen({ onComplete }: { onComplete: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleSub, setGoogleSub] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  async function signInWithGoogle() {
    setIsSubmitting(true);

    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const response = await GoogleSignin.signIn();

      if (response.type !== 'success') {
        return;
      }

      setGoogleSub(response.data.user.id);
      setDisplayName(response.data.user.name ?? '');
      setEmail(response.data.user.email);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Google sign-in failed.';
      Alert.alert('Sign-in failed', detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function registerAccount() {
    if (!googleSub) {
      Alert.alert('Google sign-in required', 'Sign in before continuing.');
      return;
    }

    if (!displayName.trim() || !phoneNumber.trim()) {
      Alert.alert('Missing details', 'Enter your name and phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const dialedPhone = normalizeDialedPhone(phoneNumber);
      const response = await fetch(`${BACKEND_HTTP_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sub: googleSub,
          dialed_phone: dialedPhone,
        }),
      });

      await assertSuccessfulResponse(response, 'Registration');

      await AsyncStorage.setItem(USER_REGISTERED_KEY, 'true');
      await AsyncStorage.setItem(GOOGLE_SUB_KEY, googleSub);
      await AsyncStorage.setItem(USER_NAME_KEY, displayName.trim());
      await AsyncStorage.setItem(USER_PHONE_KEY, dialedPhone);
      onComplete();
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Account registration failed.';
      Alert.alert('Registration failed', detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.setupContent}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brandText}>ScamShield</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Account Setup</Text>
          <Text style={styles.setupTitle}>Create your protected profile.</Text>
          <Text style={styles.setupSubtitle}>
            Sign in once and add the phone number that Twilio forwards into
            ScamShield. Future launches skip this step.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Google account</Text>
          {email ? <Text style={styles.panelBody}>{email}</Text> : null}
          <Pressable
            disabled={isSubmitting}
            onPress={signInWithGoogle}
            style={[styles.secondaryButton, isSubmitting && styles.disabledButton]}>
            <Text style={styles.secondaryButtonText}>
              {googleSub ? 'Google connected' : 'Sign in with Google'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Your details</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Full name"
            placeholderTextColor="#6f879a"
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone number"
            placeholderTextColor="#6f879a"
            style={styles.input}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        </View>

        <Pressable
          disabled={isSubmitting || !googleSub}
          onPress={registerAccount}
          style={[
            styles.primaryButton,
            (isSubmitting || !googleSub) && styles.disabledButton,
          ]}>
          {isSubmitting ? (
            <ActivityIndicator color="#04101a" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BootScreen() {
  return (
    <SafeAreaView style={styles.loadingScreen}>
      <View style={styles.loadingBadge}>
        <Text style={styles.loadingBadgeText}>ScamShield</Text>
      </View>
      <ActivityIndicator color="#4e844a" size="large" />
      <Text style={styles.loadingTitle}>Preparing ScamShield</Text>
      <Text style={styles.loadingBody}>
        Checking whether this device has already been protected.
      </Text>
    </SafeAreaView>
  );
}

function SetupScreen({ onReady }: { onReady: () => void }) {
  const [isImporting, setIsImporting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [safeListCount, setSafeListCount] = useState<number | null>(null);

  async function skipForDemo() {
    await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
    await AsyncStorage.setItem(TWILIO_NUMBER_KEY, TWILIO_NUMBER);
    onReady();
  }

  async function importContacts() {
    setIsImporting(true);
    setPermissionDenied(false);

    try {
      const granted = await requestContactsPermission();

      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      const contacts = await Contacts.getAllWithoutPhotos();
      const phoneNumbers = collectPhoneNumbers(contacts);
      const googleSub = await AsyncStorage.getItem(GOOGLE_SUB_KEY);

      if (!googleSub) {
        throw new Error('Google setup is required before importing contacts.');
      }

      const response = await fetch(`${BACKEND_HTTP_URL}/api/safelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_sub: googleSub,
          phone_numbers: phoneNumbers,
        }),
      });

      await assertSuccessfulResponse(response, 'Safelist upload');

      await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
      await AsyncStorage.setItem(TWILIO_NUMBER_KEY, TWILIO_NUMBER);
      setSafeListCount(phoneNumbers.length);
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Contacts could not be imported right now.';
      Alert.alert('Setup incomplete', detail);
    } finally {
      setIsImporting(false);
    }
  }

  function copyNumber() {
    Clipboard.setString(TWILIO_NUMBER);
    Alert.alert('Number copied', 'The forwarding number is ready for your dialer.');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.setupContent}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brandText}>ScamShield</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Device Setup</Text>
          <Text style={styles.setupTitle}>
            Turn this phone into a scam alert device.
          </Text>
          <Text style={styles.setupSubtitle}>
            Import trusted numbers once, forward calls to your demo line, and keep
            ScamShield open while protection stays active.
          </Text>
        </View>

        <View style={styles.highlightStrip}>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>1x</Text>
            <Text style={styles.highlightLabel}>contact import</Text>
          </View>
          <View style={styles.highlightItem}>
            <Text style={styles.highlightValue}>24/7</Text>
            <Text style={styles.highlightLabel}>alert readiness</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Forwarding number</Text>
          <View style={styles.numberRow}>
            <Text style={styles.numberText}>{TWILIO_NUMBER}</Text>
            <Pressable onPress={copyNumber} style={styles.copyButton}>
              <Text style={styles.copyButtonText}>Copy</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Call forwarding</Text>
          <Text style={styles.stepText}>1. Open your phone dialer</Text>
          <Text style={styles.stepText}>
            2. Dial *72 followed by your Twilio number
          </Text>
          <Text style={styles.stepText}>
            3. Press call and wait for the confirmation tone
          </Text>
          <Text style={styles.stepText}>
            4. Hang up because forwarding is now active
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Trusted contacts</Text>
          <Text style={styles.panelBody}>
            ScamShield reads phone numbers only, normalizes them, removes
            duplicates, and sends the final list to your backend safe list.
          </Text>
          {permissionDenied ? (
            <Text style={styles.warningText}>
              Contacts permission is required before ScamShield can protect this
              device correctly.
            </Text>
          ) : null}
          {safeListCount !== null ? (
            <Text style={styles.successText}>
              {safeListCount} trusted numbers imported.
            </Text>
          ) : null}
          <Pressable
            disabled={isImporting}
            onPress={importContacts}
            style={[styles.primaryButton, isImporting && styles.disabledButton]}>
            {isImporting ? (
              <ActivityIndicator color="#04101a" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {permissionDenied
                  ? 'Try again'
                  : safeListCount !== null
                    ? 'Re-import contacts'
                    : 'Import contacts'}
              </Text>
            )}
          </Pressable>
          {permissionDenied ? (
            <Pressable onPress={Linking.openSettings} style={styles.textButton}>
              <Text style={styles.textButtonText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          disabled={safeListCount === null}
          onPress={onReady}
          style={[styles.readyButton, safeListCount === null && styles.disabledButton]}>
          <Text style={styles.readyButtonText}>I'm ready</Text>
        </Pressable>

        <Pressable onPress={skipForDemo} style={styles.demoButton}>
          <Text style={styles.demoButtonText}>Skip for demo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProtectedScreen({
  pushStatus,
  onEnablePush,
  onBackToSetup,
  onTestAlert,
  onTestNotification,
}: {
  pushStatus: PushStatus;
  onEnablePush: () => void;
  onBackToSetup: () => void;
  onTestAlert: () => void;
  onTestNotification: () => void;
}) {
  const pushLabel =
    pushStatus === 'registered'
      ? 'Push registered'
      : pushStatus === 'registering'
        ? 'Registering push...'
        : pushStatus === 'denied'
          ? 'Push denied'
          : pushStatus === 'unsupported'
            ? 'Push unavailable'
            : pushStatus === 'failed'
              ? 'Push upload failed'
              : 'Push not registered';
  const pushDetail =
    pushStatus === 'registered'
      ? 'The backend can send scam alerts to this device.'
      : pushStatus === 'registering'
        ? 'Requesting notification permission and registering this phone.'
        : pushStatus === 'denied'
          ? 'Enable notifications in iOS Settings to receive background alerts.'
          : pushStatus === 'unsupported'
            ? 'Push alerts are unavailable on this platform.'
            : pushStatus === 'failed'
              ? 'Check the backend URL, then tap Enable push again.'
              : 'Tap Enable push to register this device with the backend.';

  return (
    <SafeAreaView style={styles.protectedScreen}>
      <ScrollView
        contentContainerStyle={styles.protectedContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.protectedHeader}>
          <View>
            <Text style={styles.eyebrow}>Alert Readiness</Text>
            <Text style={styles.protectedTitle}>Call protected</Text>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                pushStatus === 'registered'
                  ? styles.readyDot
                  : styles.waitingDot,
              ]}
            />
            <Text style={styles.statusText}>{pushLabel}</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.shieldFrame}>
            <View style={styles.shieldCore}>
              <Text style={styles.shieldText}>S</Text>
            </View>
          </View>

          <Text style={styles.protectedMessage}>ScamShield is standing by.</Text>
          <Text style={styles.protectedBody}>
            Scam alerts arrive through push notifications when this app is in the
            background. Local testing still works with the test button below.
          </Text>
        </View>

        <View style={styles.statePanel}>
          <Text style={styles.panelLabel}>Current state</Text>
          <Text style={styles.stateValue}>{pushLabel}</Text>
          <Text style={styles.pushValue}>{pushDetail}</Text>
        </View>

        <View style={styles.footerActions}>
          <Pressable onPress={onTestAlert} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Test alert</Text>
          </Pressable>
          <Pressable onPress={onTestNotification} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Test notification</Text>
          </Pressable>
          <Pressable onPress={onEnablePush} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Enable push</Text>
          </Pressable>
          <Pressable onPress={onBackToSetup} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Setup</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AlertScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timers = [0, 700, 1400].map(delay =>
      setTimeout(() => {
        HapticFeedback.trigger('notificationError', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }, delay),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <SafeAreaView style={styles.alertScreen}>
      <View style={styles.alertRingOuter} />
      <View style={styles.alertRingInner} />
      <View style={styles.alertContent}>
        <Text style={styles.alertLabel}>Alert</Text>
        <Text style={styles.alertTitle}>SCAM DETECTED</Text>
        <Text style={styles.alertMessage}>Hang up now.</Text>
        <Text style={styles.alertBody}>
          This call has been flagged as suspicious. End it immediately, then
          return to protected mode.
        </Text>
        <Pressable onPress={onDone} style={styles.alertButton}>
          <Text style={styles.alertButtonText}>I've hung up</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F2',
    paddingHorizontal: 28,
    gap: 16,
  },
  loadingBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#E3EDE1',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  loadingBadgeText: {
    color: '#30542E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  loadingTitle: {
    color: '#1F2A1F',
    fontSize: 30,
    fontWeight: '800',
  },
  loadingBody: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  setupContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3EDE1',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  logoText: {
    color: '#284426',
    fontSize: 22,
    fontWeight: '900',
  },
  brandText: {
    color: '#284426',
    fontSize: 20,
    fontWeight: '900',
  },
  heroBlock: {
    gap: 10,
  },
  eyebrow: {
    alignSelf: 'flex-start',
    color: '#4E844A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  setupTitle: {
    color: '#1F2A1F',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  setupSubtitle: {
    color: '#57534E',
    fontSize: 16,
    lineHeight: 24,
  },
  highlightStrip: {
    flexDirection: 'row',
    gap: 12,
  },
  highlightItem: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#284426',
  },
  highlightValue: {
    color: '#FAF8F2',
    fontSize: 24,
    fontWeight: '900',
  },
  highlightLabel: {
    color: '#D6E3D4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  panel: {
    borderRadius: 22,
    padding: 18,
    gap: 12,
    backgroundColor: '#FEFEFB',
    borderWidth: 1,
    borderColor: '#E7E1D5',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  panelLabel: {
    color: '#4E844A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberText: {
    flex: 1,
    color: '#1C1917',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F4F8F3',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  copyButtonText: {
    color: '#30542E',
    fontSize: 15,
    fontWeight: '800',
  },
  stepText: {
    color: '#44403C',
    fontSize: 16,
    lineHeight: 24,
  },
  panelBody: {
    color: '#57534E',
    fontSize: 15,
    lineHeight: 23,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E1D5',
    backgroundColor: '#FAF8F2',
    color: '#1C1917',
    fontSize: 16,
    paddingHorizontal: 14,
  },
  warningText: {
    color: '#B91C1C',
    fontSize: 15,
    lineHeight: 22,
  },
  successText: {
    color: '#3B6838',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E844A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  readyButton: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#213821',
  },
  readyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  demoButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F3',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  demoButtonText: {
    color: '#30542E',
    fontSize: 16,
    fontWeight: '800',
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  textButtonText: {
    color: '#4E844A',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  protectedScreen: {
    flex: 1,
    backgroundColor: '#FAF8F2',
  },
  protectedContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 18,
  },
  protectedHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  protectedTitle: {
    color: '#1F2A1F',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FEFEFB',
    borderWidth: 1,
    borderColor: '#E7E1D5',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  readyDot: {
    backgroundColor: '#4E844A',
  },
  waitingDot: {
    backgroundColor: '#D97706',
  },
  statusText: {
    color: '#44403C',
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: '#FEFEFB',
    borderWidth: 1,
    borderColor: '#E7E1D5',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  shieldFrame: {
    width: 220,
    height: 220,
    borderRadius: 110,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3EDE1',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  shieldCore: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4E844A',
  },
  shieldText: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
  },
  protectedMessage: {
    color: '#1F2A1F',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  protectedBody: {
    color: '#57534E',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
  },
  statePanel: {
    width: '100%',
    borderRadius: 22,
    padding: 18,
    gap: 8,
    backgroundColor: '#FEFEFB',
    borderWidth: 1,
    borderColor: '#E7E1D5',
  },
  stateValue: {
    color: '#1C1917',
    fontSize: 18,
    fontWeight: '800',
  },
  pushValue: {
    color: '#57534E',
    fontSize: 15,
    lineHeight: 22,
  },
  footerActions: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F8F3',
    borderWidth: 1,
    borderColor: '#C5D9C2',
  },
  secondaryButtonText: {
    color: '#30542E',
    fontSize: 16,
    fontWeight: '800',
  },
  alertScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#7F1D1D',
  },
  alertRingOuter: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#991B1B',
    opacity: 0.85,
  },
  alertRingInner: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#B91C1C',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  alertContent: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingVertical: 30,
    backgroundColor: 'rgba(127, 29, 29, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.35)',
  },
  alertLabel: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  alertTitle: {
    color: '#FEF2F2',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    textAlign: 'center',
  },
  alertMessage: {
    color: '#FEF2F2',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  alertBody: {
    color: '#FECACA',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  alertButton: {
    marginTop: 24,
    width: '100%',
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  alertButtonText: {
    color: '#991B1B',
    fontSize: 17,
    fontWeight: '900',
  },
});

export default App;

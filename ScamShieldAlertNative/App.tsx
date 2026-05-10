import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import messaging from '@react-native-firebase/messaging';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

        token = await messaging().getToken();
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

      setPushStatus('registered');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
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
        if (isScamAlertPayload(remoteMessage.data)) {
          setScreen('alert');
        }
      });

      const unsubscribeOpened = messaging().onNotificationOpenedApp(
        remoteMessage => {
          if (isScamAlertPayload(remoteMessage.data)) {
            setScreen('alert');
          }
        },
      );

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (mounted && isScamAlertPayload(remoteMessage?.data)) {
            setScreen('alert');
          }
        })
        .catch(() => undefined);

      pushSubscription = {
        remove: () => {
          unsubscribeForeground();
          unsubscribeOpened();
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

        <Text style={styles.setupTitle}>Create your protected profile.</Text>
        <Text style={styles.setupSubtitle}>
          Sign in once and add the phone number that Twilio forwards into
          ScamShield. Future launches skip this step.
        </Text>

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
      <ActivityIndicator color="#8ef2c1" size="large" />
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

        <Text style={styles.setupTitle}>
          Turn this phone into a scam alert device.
        </Text>
        <Text style={styles.setupSubtitle}>
          Import trusted numbers once, forward calls to your demo line, and keep
          ScamShield open while protection stays active.
        </Text>

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
}: {
  pushStatus: PushStatus;
  onEnablePush: () => void;
  onBackToSetup: () => void;
  onTestAlert: () => void;
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
      <View style={styles.protectedHeader}>
        <View>
          <Text style={styles.panelLabel}>Alert readiness</Text>
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

      <View style={styles.statePanel}>
        <Text style={styles.panelLabel}>Current state</Text>
        <Text style={styles.stateValue}>{pushLabel}</Text>
        <Text style={styles.pushValue}>{pushDetail}</Text>
      </View>

      <View style={styles.footerActions}>
        <Pressable onPress={onTestAlert} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Test alert</Text>
        </Pressable>
        <Pressable onPress={onEnablePush} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Enable push</Text>
        </Pressable>
        <Pressable onPress={onBackToSetup} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Setup</Text>
        </Pressable>
      </View>
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
      <View style={styles.alertRing} />
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
    backgroundColor: '#07111f',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07111f',
    paddingHorizontal: 28,
    gap: 14,
  },
  loadingTitle: {
    color: '#f5fbff',
    fontSize: 28,
    fontWeight: '800',
  },
  loadingBody: {
    color: '#9db6ca',
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ef2c1',
  },
  logoText: {
    color: '#04101a',
    fontSize: 22,
    fontWeight: '900',
  },
  brandText: {
    color: '#f5fbff',
    fontSize: 20,
    fontWeight: '900',
  },
  setupTitle: {
    color: '#f5fbff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  setupSubtitle: {
    color: '#9db6ca',
    fontSize: 16,
    lineHeight: 24,
  },
  panel: {
    borderRadius: 8,
    padding: 18,
    gap: 12,
    backgroundColor: '#0c1d2f',
    borderWidth: 1,
    borderColor: '#20384f',
  },
  panelLabel: {
    color: '#8ef2c1',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberText: {
    flex: 1,
    color: '#f5fbff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  copyButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5fbff',
  },
  copyButtonText: {
    color: '#07111f',
    fontSize: 15,
    fontWeight: '800',
  },
  stepText: {
    color: '#dce9f4',
    fontSize: 16,
    lineHeight: 24,
  },
  panelBody: {
    color: '#dce9f4',
    fontSize: 15,
    lineHeight: 23,
  },
  input: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#29445e',
    backgroundColor: '#07111f',
    color: '#f5fbff',
    fontSize: 16,
    paddingHorizontal: 14,
  },
  warningText: {
    color: '#ffc0b2',
    fontSize: 15,
    lineHeight: 22,
  },
  successText: {
    color: '#8ef2c1',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ef2c1',
  },
  primaryButtonText: {
    color: '#04101a',
    fontSize: 16,
    fontWeight: '900',
  },
  readyButton: {
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe089',
  },
  readyButtonText: {
    color: '#281700',
    fontSize: 17,
    fontWeight: '900',
  },
  demoButton: {
    minHeight: 54,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#132b43',
    borderWidth: 1,
    borderColor: '#29445e',
  },
  demoButtonText: {
    color: '#f5fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  textButton: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  textButtonText: {
    color: '#f5fbff',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
  protectedScreen: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#06101e',
  },
  protectedHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  protectedTitle: {
    color: '#f5fbff',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0c1d2f',
    borderWidth: 1,
    borderColor: '#20384f',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  readyDot: {
    backgroundColor: '#8ef2c1',
  },
  waitingDot: {
    backgroundColor: '#ffd36e',
  },
  statusText: {
    color: '#dce9f4',
    fontSize: 14,
    fontWeight: '800',
  },
  shieldFrame: {
    width: 220,
    height: 220,
    borderRadius: 110,
    marginTop: 56,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#113421',
    borderWidth: 1,
    borderColor: '#2e6b4a',
  },
  shieldCore: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8ef2c1',
  },
  shieldText: {
    color: '#04101a',
    fontSize: 72,
    fontWeight: '900',
  },
  protectedMessage: {
    color: '#f5fbff',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  protectedBody: {
    color: '#a7bfd1',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 28,
  },
  statePanel: {
    width: '100%',
    borderRadius: 8,
    padding: 18,
    gap: 8,
    backgroundColor: '#0c1d2f',
    borderWidth: 1,
    borderColor: '#20384f',
  },
  stateValue: {
    color: '#dce9f4',
    fontSize: 18,
    fontWeight: '800',
  },
  pushValue: {
    color: '#a7bfd1',
    fontSize: 15,
    lineHeight: 22,
  },
  footerActions: {
    marginTop: 'auto',
    width: '100%',
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#132b43',
    borderWidth: 1,
    borderColor: '#29445e',
  },
  secondaryButtonText: {
    color: '#f5fbff',
    fontSize: 16,
    fontWeight: '800',
  },
  alertScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#9d1422',
  },
  alertRing: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#b82130',
    borderWidth: 1,
    borderColor: '#ef7d86',
  },
  alertContent: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  alertLabel: {
    color: '#ffd5d5',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  alertTitle: {
    color: '#fff5f5',
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    textAlign: 'center',
  },
  alertMessage: {
    color: '#fff5f5',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  alertBody: {
    color: '#ffd7d2',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  alertButton: {
    marginTop: 24,
    width: '100%',
    minHeight: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
  },
  alertButtonText: {
    color: '#8a1020',
    fontSize: 17,
    fontWeight: '900',
  },
});

export default App;

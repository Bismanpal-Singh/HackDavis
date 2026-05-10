# ScamShield Alert Native

This is a clean React Native CLI app for the ScamShield alert-device demo. It does not use Expo and does not touch the existing `ScamShield` app.

## What It Does

- Imports contacts and posts normalized phone numbers to `/api/safelist`
- Stores `setup_complete` and `twilio_number` locally
- Registers an Android FCM token or iOS APNs token with `/api/push-token`
- Shows push registration status on the protected screen
- Switches to a full-screen red scam alert on push data `{ "type": "scam_alert" }`
- Fires repeated native haptics on the alert screen

## Configure

Update the constants at the top of `App.tsx`:

```ts
const TWILIO_NUMBER = '(855) 555-0199';
const BACKEND_HTTP_URL = 'https://replace-with-your-ngrok-url.ngrok-free.app';
```

## Android Firebase Setup

Create a Firebase Android app with this package name:

```text
com.scamshieldalertnative
```

Download `google-services.json` from Firebase and place it here:

```text
android/app/google-services.json
```

The file is intentionally ignored by git.

The app sends this token payload to your backend:

```json
{
  "platform": "android",
  "provider": "fcm",
  "token": "fcm-device-token"
}
```

Use an FCM notification with data for scam alerts:

```json
{
  "message": {
    "token": "fcm-device-token",
    "notification": {
      "title": "SCAM DETECTED",
      "body": "Hang up now"
    },
    "data": {
      "type": "scam_alert"
    },
    "android": {
      "priority": "high"
    }
  }
}
```

## Run

```sh
npm start
```

In another terminal:

```sh
npm run ios
```

For Android:

```sh
npm run android
```

For iOS after changing native dependencies:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

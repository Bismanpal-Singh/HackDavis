# ScamShield

Milestone 2 for the phone/audio pipeline:

`iPhone mic -> native PCM chunks -> Deepgram live WebSocket -> transcript UI`

## Demo flow

1. Run the iOS app.
2. Put your Deepgram API key into `deepgram.config.ts`.
3. Tap `Start Listening`.
4. Speak near the phone or put the call on speakerphone.
5. Watch live interim text and finalized transcript phrases appear in the app.

## What is implemented

- Native iOS mic capture using `AVAudioEngine`
- Four-second PCM chunk emission from the React Native bridge
- Direct React Native `WebSocket` connection to Deepgram live STT
- Automatic reconnect attempt if the socket drops
- Finalized transcript log plus live interim transcript panel

## Notes

- Copy `deepgram.config.example.ts` to `deepgram.config.ts` if you need to recreate the local config file, then replace the placeholder key.
- The current demo uses a Deepgram API key directly from the client bundle. That is acceptable for milestone demos, but production should use backend-issued temporary tokens instead.
- The current milestone stops at transcript display. Backend forwarding can plug into the transcript accumulator in the next step.

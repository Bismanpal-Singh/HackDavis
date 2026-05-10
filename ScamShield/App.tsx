import {Buffer} from 'buffer';
import {useEffect, useRef, useState} from 'react';
import {DEEPGRAM_API_KEY} from './deepgram.config';
import {
  Alert,
  NativeEventEmitter,
  NativeModules,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type AudioCaptureEvent = {
  timestamp: number;
  chunkIndex: number;
  byteLength: number;
  sampleRate: number;
  channels: number;
  level: number;
  audioBase64?: string;
};

type AudioCaptureModule = {
  start: () => Promise<{sampleRate: number; channels: number}>;
  stop: () => Promise<void>;
  isCapturing: () => Promise<boolean>;
};

type TranscriptEntry = {
  id: number;
  timestamp: number;
  text: string;
  confidence: number;
};

type DeepgramResultMessage = {
  type?: string;
  request_id?: string;
  channel?: {
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
    }>;
  };
  is_final?: boolean;
  metadata?: {
    request_id?: string;
  };
};

const audioCapture =
  NativeModules.ScamShieldAudioCapture as AudioCaptureModule | undefined;

const DEEPGRAM_URL = 'wss://api.deepgram.com/v1/listen';
const KEEP_ALIVE_MS = 8000;
const MAX_PENDING_CHUNKS = 8;
const MAX_TRANSCRIPT_ENTRIES = 12;

function buildDeepgramUrl(sampleRate: number) {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en-US',
    encoding: 'linear16',
    sample_rate: String(Math.round(sampleRate)),
    punctuate: 'true',
    smart_format: 'true',
    interim_results: 'true',
    vad_events: 'true',
    endpointing: '300',
    utterance_end_ms: '1000',
  });

  return `${DEEPGRAM_URL}?${params.toString()}`;
}

function decodeAudioChunk(base64Audio: string) {
  const buffer = Buffer.from(base64Audio, 'base64');
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState(
    'Ready to stream to Deepgram.',
  );
  const [deepgramStatus, setDeepgramStatus] = useState<
    'idle' | 'connecting' | 'live' | 'reconnecting' | 'error'
  >('idle');
  const [latestChunk, setLatestChunk] = useState<AudioCaptureEvent | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [level, setLevel] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
  const [requestId, setRequestId] = useState('');

  const websocketRef = useRef<WebSocket | null>(null);
  const keepAliveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAudioRef = useRef<ArrayBuffer[]>([]);
  const sampleRateRef = useRef(48_000);
  const isListeningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const transcriptIdRef = useRef(0);
  const deepgramKeyRef = useRef(DEEPGRAM_API_KEY.trim());

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!audioCapture) {
      setStatus('Native audio module is unavailable on this device.');
      return;
    }

    const emitter = new NativeEventEmitter(NativeModules.ScamShieldAudioCapture);
    const subscription = emitter.addListener(
      'ScamShieldAudioChunk',
      (event: AudioCaptureEvent) => {
        setLatestChunk(event);
        setChunkCount(event.chunkIndex);
        setLevel(event.level);
        streamAudioChunk(event);
      },
    );

    audioCapture.isCapturing().then(setIsListening).catch(() => undefined);

    return () => {
      subscription.remove();
      teardownDeepgram(false);
    };
  }, []);

  function resetTranscriptState() {
    pendingAudioRef.current = [];
    transcriptIdRef.current = 0;
    setChunkCount(0);
    setLatestChunk(null);
    setLevel(0);
    setLiveTranscript('');
    setTranscriptLog([]);
    setRequestId('');
  }

  function connectDeepgram(sampleRate: number) {
    const trimmedKey = deepgramKeyRef.current;
    if (!trimmedKey) {
      setDeepgramStatus('error');
      setStatus('Deepgram API key is required before you can stream audio.');
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const socket = new WebSocket(buildDeepgramUrl(sampleRate), ['token', trimmedKey]);
    websocketRef.current = socket;
    setDeepgramStatus('connecting');
    setStatus('Connecting to Deepgram live transcription...');

    socket.onopen = () => {
      setDeepgramStatus('live');
      setStatus('Microphone live. Streaming audio to Deepgram now.');
      flushPendingAudio();

      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
      }

      keepAliveTimerRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({type: 'KeepAlive'}));
        }
      }, KEEP_ALIVE_MS);
    };

    socket.onmessage = event => {
      if (typeof event.data !== 'string') {
        return;
      }

      let payload: DeepgramResultMessage;

      try {
        payload = JSON.parse(event.data) as DeepgramResultMessage;
      } catch {
        return;
      }

      if (payload.type === 'Metadata') {
        const nextRequestId = payload.request_id ?? payload.metadata?.request_id;
        if (nextRequestId) {
          setRequestId(nextRequestId);
        }
        return;
      }

      if (payload.type !== 'Results') {
        return;
      }

      const alternative = payload.channel?.alternatives?.[0];
      const transcriptText = alternative?.transcript?.trim() ?? '';

      if (!transcriptText) {
        return;
      }

      if (payload.is_final) {
        setLiveTranscript('');
        setTranscriptLog(currentEntries => {
          const previousText = currentEntries[currentEntries.length - 1]?.text;
          if (previousText === transcriptText) {
            return currentEntries;
          }

          const nextEntry: TranscriptEntry = {
            id: transcriptIdRef.current++,
            timestamp: Math.floor(Date.now() / 1000),
            text: transcriptText,
            confidence: alternative?.confidence ?? 0,
          };

          return [...currentEntries, nextEntry].slice(-MAX_TRANSCRIPT_ENTRIES);
        });
      } else {
        setLiveTranscript(transcriptText);
      }
    };

    socket.onerror = () => {
      setDeepgramStatus('error');
      setStatus('Deepgram connection hit an error. Reconnecting...');
    };

    socket.onclose = () => {
      if (keepAliveTimerRef.current) {
        clearInterval(keepAliveTimerRef.current);
        keepAliveTimerRef.current = null;
      }

      websocketRef.current = null;

      if (isStoppingRef.current || !isListeningRef.current) {
        return;
      }

      setDeepgramStatus('reconnecting');
      setStatus('Deepgram disconnected. Reconnecting...');

      reconnectTimerRef.current = setTimeout(() => {
        connectDeepgram(sampleRateRef.current);
      }, 1200);
    };
  }

  function flushPendingAudio() {
    const socket = websocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const chunk of pendingAudioRef.current) {
      socket.send(chunk);
    }

    pendingAudioRef.current = [];
  }

  function streamAudioChunk(event: AudioCaptureEvent) {
    if (!event.audioBase64) {
      return;
    }

    const audioChunk = decodeAudioChunk(event.audioBase64);
    const socket = websocketRef.current;

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(audioChunk);
      return;
    }

    pendingAudioRef.current.push(audioChunk);
    if (pendingAudioRef.current.length > MAX_PENDING_CHUNKS) {
      pendingAudioRef.current = pendingAudioRef.current.slice(-MAX_PENDING_CHUNKS);
    }
  }

  function teardownDeepgram(sendCloseStream: boolean) {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }

    const socket = websocketRef.current;
    websocketRef.current = null;
    pendingAudioRef.current = [];

    if (!socket) {
      return;
    }

    if (sendCloseStream && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({type: 'Finalize'}));
      socket.send(JSON.stringify({type: 'CloseStream'}));
    }

    socket.close();
  }

  async function toggleListening() {
    if (!audioCapture) {
      Alert.alert(
        'Audio unavailable',
        'The native iOS audio module did not load. Run the iOS app from Xcode or npx react-native run-ios.',
      );
      return;
    }

    if (isListening) {
      isStoppingRef.current = true;
      teardownDeepgram(true);
      await audioCapture.stop();
      setIsListening(false);
      setDeepgramStatus('idle');
      setStatus('Stopped listening.');
      return;
    }

    if (!deepgramKeyRef.current || deepgramKeyRef.current === 'paste-your-deepgram-api-key-here') {
      Alert.alert(
        'Deepgram key required',
        'Add your key in deepgram.config.ts so the app can open a live transcription socket.',
      );
      return;
    }

    try {
      isStoppingRef.current = false;
      resetTranscriptState();
      const result = await audioCapture.start();
      sampleRateRef.current = result.sampleRate;
      setIsListening(true);
      setStatus(
        `Mic running at ${Math.round(result.sampleRate)} Hz. Opening Deepgram stream...`,
      );
      connectDeepgram(result.sampleRate);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start microphone';
      setDeepgramStatus('error');
      setStatus(message);
      Alert.alert('Microphone error', message);
    }
  }

  const levelPercent = Math.min(100, level * 100);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: safeAreaInsets.top + 24,
          paddingBottom: safeAreaInsets.bottom + 24,
        },
      ]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ScamShield Milestone 2</Text>
          <Text style={styles.title}>Deepgram Live Transcript</Text>
          <Text style={styles.subtitle}>
            Streams native iPhone mic PCM into Deepgram and shows finalized plus
            live interim transcript text in real time.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deepgram Setup</Text>
          <Text style={styles.helperText}>
            The app reads your local key from `deepgram.config.ts`. For the
            demo that keeps startup simple, and later we can swap it to backend
            temporary tokens.
          </Text>
          <Text style={styles.configPath}>deepgram.config.ts</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isListening ? styles.statusDotActive : null,
              ]}
            />
            <Text style={styles.statusLabel}>
              Mic: {isListening ? 'listening' : 'idle'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                deepgramStatus === 'live' ? styles.statusDotActive : null,
                deepgramStatus === 'error' ? styles.statusDotError : null,
              ]}
            />
            <Text style={styles.statusLabel}>Deepgram: {deepgramStatus}</Text>
          </View>

          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, {width: `${levelPercent}%`}]} />
          </View>

          <Text style={styles.statusMessage}>{status}</Text>

          {requestId ? (
            <Text style={styles.metadata}>Request ID: {requestId}</Text>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{chunkCount}</Text>
            <Text style={styles.statLabel}>chunks sent</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {latestChunk ? `${Math.round(latestChunk.byteLength / 1024)} KB` : '-'}
            </Text>
            <Text style={styles.statLabel}>last chunk</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {latestChunk ? Math.round(latestChunk.sampleRate) : '-'}
            </Text>
            <Text style={styles.statLabel}>sample rate</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statValue}>{transcriptLog.length}</Text>
            <Text style={styles.statLabel}>final phrases</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transcript</Text>
          {transcriptLog.length === 0 ? (
            <Text style={styles.emptyState}>
              Finalized phrases will appear here once Deepgram starts returning
              results.
            </Text>
          ) : (
            transcriptLog
              .slice()
              .reverse()
              .map(entry => (
                <View key={entry.id} style={styles.transcriptEntry}>
                  <Text style={styles.transcriptTime}>
                    {formatTimestamp(entry.timestamp)}
                  </Text>
                  <Text style={styles.transcriptText}>{entry.text}</Text>
                  <Text style={styles.transcriptConfidence}>
                    confidence {Math.round(entry.confidence * 100)}%
                  </Text>
                </View>
              ))
          )}

          <View style={styles.liveBubble}>
            <Text style={styles.liveLabel}>Live interim</Text>
            <Text style={styles.liveTranscript}>
              {liveTranscript || 'Waiting for speech...'}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={toggleListening}
          style={({pressed}) => [
            styles.primaryButton,
            isListening ? styles.stopButton : null,
            pressed ? styles.primaryButtonPressed : null,
          ]}>
          <Text style={styles.primaryButtonText}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F0E6',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 18,
  },
  header: {
    gap: 10,
  },
  eyebrow: {
    color: '#59694C',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#162014',
    fontSize: 38,
    fontWeight: '800',
  },
  subtitle: {
    color: '#495348',
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    backgroundColor: '#FFFDF8',
    borderColor: '#D9D1C3',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  cardTitle: {
    color: '#162014',
    fontSize: 18,
    fontWeight: '700',
  },
  helperText: {
    color: '#627061',
    fontSize: 14,
    lineHeight: 20,
  },
  configPath: {
    backgroundColor: '#F6F1E7',
    borderColor: '#DDD3C2',
    borderRadius: 14,
    borderWidth: 1,
    color: '#162014',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusDot: {
    backgroundColor: '#A9B3AA',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  statusDotActive: {
    backgroundColor: '#2D8A4D',
  },
  statusDotError: {
    backgroundColor: '#B2402D',
  },
  statusLabel: {
    color: '#162014',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  meterTrack: {
    backgroundColor: '#E8E1D2',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  meterFill: {
    backgroundColor: '#D16C45',
    borderRadius: 999,
    height: '100%',
  },
  statusMessage: {
    color: '#3E473C',
    fontSize: 15,
    lineHeight: 21,
  },
  metadata: {
    color: '#738078',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    backgroundColor: '#162014',
    borderRadius: 18,
    gap: 6,
    minWidth: '47%',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  statValue: {
    color: '#FFF9ED',
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: '#C8D0C5',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  emptyState: {
    color: '#6A7567',
    fontSize: 15,
    lineHeight: 21,
  },
  transcriptEntry: {
    backgroundColor: '#F5EFE3',
    borderRadius: 14,
    gap: 8,
    padding: 14,
  },
  transcriptTime: {
    color: '#7B836C',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: '#162014',
    fontSize: 16,
    lineHeight: 22,
  },
  transcriptConfidence: {
    color: '#738078',
    fontSize: 12,
  },
  liveBubble: {
    backgroundColor: '#DCE6D6',
    borderRadius: 14,
    gap: 8,
    padding: 14,
  },
  liveLabel: {
    color: '#42614B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  liveTranscript: {
    color: '#19311C',
    fontSize: 16,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#D16C45',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  primaryButtonPressed: {
    opacity: 0.84,
  },
  stopButton: {
    backgroundColor: '#A63F36',
  },
  primaryButtonText: {
    color: '#FFF7EC',
    fontSize: 17,
    fontWeight: '800',
  },
});

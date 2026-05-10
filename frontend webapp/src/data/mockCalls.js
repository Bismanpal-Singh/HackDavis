// ─────────────────────────────────────────────────────────────
// TODO: Replace with API call → GET /api/calls?user_id=<google_sub>
// Each object maps 1-to-1 with the JSON stored by the backend.
// ─────────────────────────────────────────────────────────────

export const mockCalls = [
  {
    id: 'call_001',
    timestamp: '2025-05-08T14:23:00Z',
    duration: 143,          // seconds
    phone_number: '+1 (202) 555-0147',
    caller_label: 'Unknown',
    risk_score: 87,
    is_scam: true,
    scam_type: 'IRS Impersonation',
    confidence: 87,
    matched_known_script: true,
    flagged_phrases: [
      'social security number has been suspended',
      'federal warrant',
      'pay immediately',
    ],
    transcript:
      'Hello, this is Officer Daniel Hayes calling from the Internal Revenue Service. ' +
      'We have identified that your social security number has been suspended due to suspicious activity on your account. ' +
      'You currently owe $3,847 in unpaid federal taxes. ' +
      'A federal warrant has been issued for your arrest and officers will be dispatched to your location. ' +
      'If you wish to avoid arrest you must pay immediately using gift cards or wire transfer. ' +
      'Press 1 now to speak with a supervisor or stay on the line.',
    explanation:
      'This call matches a documented IRS impersonation script on file with the FTC. ' +
      'Real IRS agents never call to threaten immediate arrest, demand gift card payments, or claim social security suspension. ' +
      'Three high-weight phrases were detected: SSN suspension, federal warrant, and immediate payment demand. ' +
      'The caller used urgency and fear tactics consistent with government impersonation fraud.',
    // Fake timeline: score per ~10-second window — replace with real array from backend later
    risk_timeline: [4, 6, 8, 14, 22, 36, 51, 64, 74, 81, 87, 85],
  },
  {
    id: 'call_002',
    timestamp: '2025-05-07T09:11:00Z',
    duration: 38,
    phone_number: '+1 (916) 555-0293',
    caller_label: 'Unknown',
    risk_score: 11,
    is_scam: false,
    scam_type: null,
    confidence: 94,
    matched_known_script: false,
    flagged_phrases: [],
    transcript:
      'Hi there, this is Dr. Martinez\'s office calling to confirm your appointment scheduled for tomorrow, ' +
      'Wednesday May 8th at 2:30 in the afternoon. ' +
      'Please give us a call back at 916-555-0293 if you need to reschedule or have any questions. ' +
      'Have a great day, goodbye.',
    explanation:
      'No scam indicators detected. The call is consistent with a routine appointment reminder from a medical office. ' +
      'Tone is neutral, no urgency or payment demands, no impersonation signals. ' +
      'Risk score remained low throughout the duration of the call.',
    risk_timeline: [3, 5, 7, 8, 9, 10, 11, 10, 11, 10],
  },
]

// ─────────────────────────────────────────────────────────────
// Mock user — replace with data from Google OAuth token
// ─────────────────────────────────────────────────────────────
export const mockUser = {
  name: 'Bisman Singh',
  email: 'bisman@example.com',
  avatar: null, // Google profile picture URL goes here
}

// ─────────────────────────────────────────────────────────────
// Mock family members — replace with GET /api/family?owner_id=<sub>
// ─────────────────────────────────────────────────────────────
export const mockFamily = [
  { id: 'fam_001', name: 'Mom', phone: '+1 (555) 111-2222', callCount: 1, lastSeen: '2025-05-08' },
]

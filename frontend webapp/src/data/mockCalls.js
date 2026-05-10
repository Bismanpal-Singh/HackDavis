// TODO: Replace with API call → GET /api/calls?user_id=<google_sub>
// Schema mirrors the MongoDB documents produced by the backend.
export const mockCalls = [
  {
    id: 'call_001',
    session_id: 'CAb4118cdea4e16562f4adcf73db841fd7',
    caller_phone: '+1 (202) 555-0147',  // number that called the user
    dialed_phone: '+1 (555) 867-5309', // user's own number (Twilio receives on this)
    created_at: '2026-05-10T06:33:08.663Z',
    status: 'ended',
    transcript_entries: [
      { timestamp: 1778394792.80236,   text: 'Hi, grandma. How are you doing?' },
      { timestamp: 1778394797.8122075, text: "I'm looking for some funds. I'm kinda running low on money." },
      { timestamp: 1778394802.249565,  text: 'I need to pay some debt. Can you give me a thousand dollars?' },
      { timestamp: 1778394805.96345,   text: 'And if you could purchase me some gift cards for Target or Walmart,' },
      { timestamp: 1778394810.309669,  text: 'that would be amazing. And if you could do it immediately, that would be even better.' },
      { timestamp: 1778394812.462155,  text: 'Thank you.' },
    ],
    score_history: [
      { timestamp: 1778394792.80236,   score: 0,  risk_level: 'low' },
      { timestamp: 1778394797.8122075, score: 0,  risk_level: 'low' },
      { timestamp: 1778394802.249565,  score: 0,  risk_level: 'low' },
      { timestamp: 1778394805.96345,   score: 25, risk_level: 'low' },
      { timestamp: 1778394810.309669,  score: 35, risk_level: 'medium' },
      { timestamp: 1778394812.462155,  score: 35, risk_level: 'medium' },
    ],
    current_score: 35,
    max_score: 35,
    risk_level: 'medium',
    is_scam: true,
    matched_categories: ['payment_demand', 'urgency'],
    flagged_phrases: ['gift card', 'immediately', 'running low on money', 'need to pay some debt', 'purchase gift cards'],
    latest_claude_result: {
      is_scam: true,
      confidence: 92,
      scam_type: 'Family Emergency Scam',
      matched_known_script: true,
      flagged_phrases: ['running low on money', 'need to pay some debt', 'purchase gift cards', 'immediately'],
      explanation: 'Classic family emergency scam pattern: impersonating a family member, requesting urgent financial help, and specifically asking for gift cards as payment method. The urgency and gift card request are strong indicators of scam behavior.',
    },
    alert_triggered: false,
    alert_triggered_at: null,
  },
  {
    id: 'call_002',
    session_id: 'CA_safe_9f3e2b1a',
    caller_phone: '+1 (916) 555-0293',
    dialed_phone: '+1 (555) 867-5309',
    created_at: '2026-05-09T09:11:00.000Z',
    status: 'ended',
    transcript_entries: [
      { timestamp: 1746608460.0, text: "Hi there, this is Dr. Martinez's office calling to confirm your appointment." },
      { timestamp: 1746608466.0, text: 'Your appointment is scheduled for Monday at 2 PM.' },
      { timestamp: 1746608472.0, text: 'Please call us back if you need to reschedule. Thank you and have a great day.' },
    ],
    score_history: [
      { timestamp: 1746608460.0, score: 3, risk_level: 'low' },
      { timestamp: 1746608466.0, score: 5, risk_level: 'low' },
      { timestamp: 1746608472.0, score: 8, risk_level: 'low' },
    ],
    current_score: 8,
    max_score: 8,
    risk_level: 'low',
    is_scam: false,
    matched_categories: [],
    flagged_phrases: [],
    latest_claude_result: {
      is_scam: false,
      confidence: 94,
      scam_type: null,
      matched_known_script: false,
      flagged_phrases: [],
      explanation: 'No scam indicators detected. This appears to be a legitimate medical office appointment reminder call with no pressure tactics, payment requests, or suspicious patterns.',
    },
    alert_triggered: false,
    alert_triggered_at: null,
  },
]

// TODO: Replace with Google OAuth token data
export const mockUser = {
  name: 'Bisman Singh',
  email: 'bisman@example.com',
  avatar: null,
}

// TODO: Replace with GET /api/family?owner_id=<sub>
export const mockFamily = [
  { id: 'fam_001', name: 'Mom', phone: '+1 (555) 111-2222', callCount: 1, lastSeen: '2026-05-10' },
]

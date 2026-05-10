import { motion } from 'framer-motion'
import { X, ExternalLink, Share2, Clock, Phone, Brain, ShieldCheck, ShieldAlert } from 'lucide-react'
import RiskBadge from './RiskBadge'

function fmt(ts) {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtDuration(s) { return `${Math.floor(s / 60)}m ${s % 60}s` }

// Splits transcript text and wraps flagged phrases in highlight spans
function HighlightedTranscript({ text, phrases }) {
  if (!phrases || phrases.length === 0) {
    return <p className="text-sm text-stone-600 leading-relaxed">{text}</p>
  }

  const regex = new RegExp(`(${phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <p className="text-sm text-stone-600 leading-relaxed">
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-red-100 text-red-700 font-semibold rounded px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  )
}

// Mini risk timeline chart
function RiskTimeline({ data, isScam }) {
  const w = 100, h = 40
  const max = Math.max(...data, 1)
  const color = isScam ? '#ef4444' : '#4e844a'
  const fill  = isScam ? '#fef2f2' : '#f4f8f3'

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return [x, y]
  })

  const linePts = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaPts = `0,${h} ` + pts.map(([x, y]) => `${x},${y}`).join(' ') + ` ${w},${h}`

  return (
    <div className="mt-3">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full">
        <polygon points={areaPts} fill={fill} />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-stone-400">0s</span>
        <span className="text-[10px] text-stone-400">{fmtDuration(data.length * 10)}</span>
      </div>
    </div>
  )
}

export default function CallDetail({ call, onClose }) {
  const handleFTC = () => {
    window.open('https://reportfraud.ftc.gov/', '_blank', 'noopener')
  }

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href)
    // TODO: generate shareable report link from backend
  }

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-[420px] shrink-0 h-screen bg-white border-l border-stone-100 flex flex-col overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.04)]"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
        <h2 className="text-sm font-bold text-stone-800">Call Report</h2>
        <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors">
          <X size={15} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Caller summary */}
        <div className="bg-stone-50 rounded-2xl p-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Phone size={13} className="text-stone-400" />
              <span className="text-sm font-bold text-stone-800">{call.phone_number}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <Clock size={11} />
              {fmt(call.timestamp)} · {fmtDuration(call.duration)}
            </div>
          </div>
          <RiskBadge score={call.risk_score} size="lg" />
        </div>

        {/* Risk score + timeline */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-end justify-between mb-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Risk Score</span>
            <span className="text-3xl font-extrabold text-stone-900">{call.risk_score}<span className="text-base text-stone-300">/100</span></span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full ${call.risk_score >= 60 ? 'bg-gradient-to-r from-amber-400 to-red-500' : call.risk_score >= 30 ? 'bg-gradient-to-r from-sage-400 to-amber-400' : 'bg-sage-400'}`}
              style={{ width: `${call.risk_score}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-1">Timeline</p>
          <RiskTimeline data={call.risk_timeline} isScam={call.is_scam} />
        </div>

        {/* Flagged phrases */}
        {call.flagged_phrases.length > 0 && (
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Flagged Phrases</p>
            <div className="flex flex-wrap gap-2">
              {call.flagged_phrases.map(p => (
                <span key={p} className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full">
                  "{p}"
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Explanation card */}
        <div className={`rounded-2xl p-4 border ${call.is_scam ? 'bg-red-50 border-red-200' : 'bg-sage-50 border-sage-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {call.is_scam
              ? <ShieldAlert size={15} className="text-red-500" />
              : <ShieldCheck size={15} className="text-sage-600" />
            }
            <span className={`text-xs font-extrabold uppercase tracking-wide ${call.is_scam ? 'text-red-600' : 'text-sage-700'}`}>
              {call.is_scam ? `Scam Detected — ${call.scam_type}` : 'No Scam Detected'}
            </span>
          </div>
          {call.is_scam && (
            <div className="flex items-center gap-3 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Brain size={11} className="text-stone-400" />
                <span className="text-xs text-stone-500">Confidence: <strong className="text-stone-700">{call.confidence}%</strong></span>
              </div>
              {call.matched_known_script && (
                <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                  Matches known FTC script
                </span>
              )}
            </div>
          )}
          <p className={`text-xs leading-relaxed ${call.is_scam ? 'text-red-700' : 'text-sage-700'}`}>
            {call.explanation}
          </p>
        </div>

        {/* Transcript */}
        <div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Transcript</p>
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
            <HighlightedTranscript text={call.transcript} phrases={call.flagged_phrases} />
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="px-6 py-4 border-t border-stone-100 flex gap-2">
        <button
          onClick={handleFTC}
          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
        >
          <ExternalLink size={13} />
          Report to FTC
        </button>
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors"
        >
          <Share2 size={13} />
          Share
        </button>
      </div>
    </motion.aside>
  )
}

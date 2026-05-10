import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Share2, Clock, Phone, Brain, ShieldCheck, ShieldAlert, Calendar } from 'lucide-react'
import RiskBadge from './RiskBadge'

const CATEGORY_META = {
  payment_demand:        { label: 'Payment Demand',  desc: 'Caller requested money or a financial transfer' },
  urgency:               { label: 'Urgency',          desc: 'Caller applied time pressure to force a quick decision' },
  gift_card:             { label: 'Gift Card',         desc: 'Payment via gift cards — a hallmark scam tactic' },
  impersonation:         { label: 'Impersonation',    desc: 'Caller may be pretending to be someone you know or trust' },
  government_threat:     { label: 'Gov. Threat',      desc: 'Caller threatened legal or government consequences' },
  personal_info_request: { label: 'Info Request',     desc: 'Caller asked for sensitive personal information' },
  lottery_prize:         { label: 'Lottery / Prize',  desc: 'Caller offered a prize or lottery winnings' },
}

function fmt(ts) {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function relTime(ts, startTs) {
  const diff = ts - startTs
  const m = Math.floor(diff / 60)
  const s = Math.floor(diff % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function getDuration(entries) {
  if (!entries?.length) return 0
  return Math.round(entries[entries.length - 1].timestamp - entries[0].timestamp)
}

function fmtDuration(s) {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function HighlightText({ text, phrases }) {
  if (!phrases?.length) return <span>{text}</span>
  const escaped = phrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-red-100 text-red-700 font-semibold rounded px-0.5 not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function CategoryChip({ categoryKey }) {
  const [hovered, setHovered] = useState(false)
  const meta = CATEGORY_META[categoryKey] || { label: categoryKey, desc: '' }
  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cursor-default inline-flex items-center bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1 rounded-full select-none"
      >
        {meta.label}
      </span>
      {hovered && meta.desc && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 w-52 bg-stone-900 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none text-center">
          {meta.desc}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
        </div>
      )}
    </div>
  )
}

function RiskTimeline({ scoreHistory, isScam }) {
  if (!scoreHistory?.length) return null
  const startTs = scoreHistory[0].timestamp
  const endTs   = scoreHistory[scoreHistory.length - 1].timestamp
  const span    = endTs - startTs || 1
  const maxScore = Math.max(...scoreHistory.map(s => s.score), 1)
  const W = 200, H = 48
  const color = isScam ? '#ef4444' : '#4e844a'
  const fill  = isScam ? '#fef2f2' : '#f4f8f3'

  const pts = scoreHistory.map(s => ({
    x: ((s.timestamp - startTs) / span) * W,
    y: H - (s.score / maxScore) * (H - 6),
  }))
  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPts = `0,${H} ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${W},${H}`

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-12 w-full">
        <polygon points={areaPts} fill={fill} />
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-stone-400">0:00</span>
        <span className="text-[10px] text-stone-400">{fmtDuration(Math.round(span))}</span>
      </div>
    </div>
  )
}

export default function CallDetail({ call, onClose }) {
  const claude        = call.latest_claude_result
  const isScam        = claude?.is_scam ?? call.is_scam
  const startTs       = call.transcript_entries?.[0]?.timestamp
  const duration      = getDuration(call.transcript_entries)
  const flaggedPhrases = claude?.flagged_phrases?.length ? claude.flagged_phrases : (call.flagged_phrases || [])

  const lines = (call.transcript_entries || []).map(entry => {
    const sh = call.score_history?.find(s => s.timestamp === entry.timestamp)
    return { ...entry, score: sh?.score ?? 0 }
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-stone-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-stone-400" />
            <span className="text-sm font-bold text-stone-800">{call.caller_phone || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Calendar size={12} />
            <span>{fmt(call.created_at)}</span>
            <span>·</span>
            <Clock size={12} />
            <span>{fmtDuration(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <RiskBadge score={call.max_score} size="lg" />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* Left — Transcript */}
        <div className="w-[45%] border-r border-stone-100 overflow-y-auto">
          <div className="px-8 py-6">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-4">Transcript</p>
            <div className="space-y-1">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={`flex gap-4 px-3 py-2.5 rounded-xl ${
                    line.score >= 30 ? 'bg-red-50 border border-red-100' : 'hover:bg-stone-50'
                  }`}
                >
                  <span className="text-[11px] text-stone-300 font-mono w-9 shrink-0 pt-0.5">
                    {relTime(line.timestamp, startTs)}
                  </span>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    <HighlightText text={line.text} phrases={flaggedPhrases} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Analysis */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-6">

            {/* Peak risk score + timeline */}
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <div className="flex items-end justify-between mb-3">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Peak Risk Score</span>
                <span className="text-4xl font-extrabold text-stone-900">
                  {call.max_score}<span className="text-lg text-stone-300">/100</span>
                </span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full ${
                    call.max_score >= 60
                      ? 'bg-gradient-to-r from-amber-400 to-red-500'
                      : call.max_score >= 30
                      ? 'bg-gradient-to-r from-sage-400 to-amber-400'
                      : 'bg-sage-400'
                  }`}
                  style={{ width: `${call.max_score}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-2">Risk Timeline</p>
              <RiskTimeline scoreHistory={call.score_history} isScam={isScam} />
            </div>

            {/* Detected patterns */}
            {call.matched_categories?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-2">Detected Patterns</p>
                <div className="flex flex-wrap gap-2">
                  {call.matched_categories.map(cat => (
                    <CategoryChip key={cat} categoryKey={cat} />
                  ))}
                </div>
              </div>
            )}

            {/* Flagged phrases */}
            {flaggedPhrases.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-2">Flagged Phrases</p>
                <div className="flex flex-wrap gap-2">
                  {flaggedPhrases.map(p => (
                    <span key={p} className="bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1 rounded-full">
                      "{p}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Claude AI analysis */}
            {claude && (
              <div className={`rounded-2xl p-5 border ${isScam ? 'bg-red-50 border-red-200' : 'bg-sage-50 border-sage-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isScam
                    ? <ShieldAlert size={15} className="text-red-500" />
                    : <ShieldCheck size={15} className="text-sage-600" />
                  }
                  <span className={`text-xs font-extrabold uppercase tracking-wide ${isScam ? 'text-red-600' : 'text-sage-700'}`}>
                    {isScam ? `Scam Detected — ${claude.scam_type}` : 'No Scam Detected'}
                  </span>
                </div>
                {isScam && (
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Brain size={11} className="text-stone-400" />
                      <span className="text-xs text-stone-500">
                        Confidence: <strong className="text-stone-700">{claude.confidence}%</strong>
                      </span>
                    </div>
                    {claude.matched_known_script && (
                      <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                        Matches known script
                      </span>
                    )}
                  </div>
                )}
                <p className={`text-xs leading-relaxed ${isScam ? 'text-red-700' : 'text-sage-700'}`}>
                  {claude.explanation}
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="bg-white border-t border-stone-100 px-8 py-4 flex gap-3 shrink-0">
        {isScam && (
          <button
            onClick={() => window.open('https://reportfraud.ftc.gov/', '_blank', 'noopener')}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink size={13} />
            Report to FTC
          </button>
        )}
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Share2 size={13} />
          Share Report
        </button>
      </div>
    </motion.div>
  )
}

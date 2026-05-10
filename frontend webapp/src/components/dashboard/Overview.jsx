import { motion } from 'framer-motion'
import { ShieldCheck, PhoneCall, AlertTriangle, TrendingUp } from 'lucide-react'
import RiskBadge from './RiskBadge'

function fmt(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(s) {
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

// Tiny sparkline SVG
function Sparkline({ data, color }) {
  const w = 80, h = 28
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Overview({ calls, onSelectCall }) {
  const total   = calls.length
  const scams   = calls.filter(c => c.is_scam).length
  const safe    = total - scams
  const pctSafe = total ? Math.round((safe / total) * 100) : 0

  const stats = [
    { label: 'Total Calls',    value: total,      icon: PhoneCall,      color: 'text-stone-600',  bg: 'bg-stone-100' },
    { label: 'Scams Caught',   value: scams,       icon: AlertTriangle,  color: 'text-red-600',    bg: 'bg-red-50' },
    { label: 'Safe Calls',     value: safe,        icon: ShieldCheck,    color: 'text-sage-600',   bg: 'bg-sage-50' },
    { label: 'Protection Rate',value: `${pctSafe}%`, icon: TrendingUp,   color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Overview</h1>
        <p className="text-sm text-stone-400 mt-1">Your call protection summary</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl p-5 border border-stone-100 shadow-soft"
          >
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <p className="text-2xl font-extrabold text-stone-900">{value}</p>
            <p className="text-xs text-stone-400 font-medium mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent calls */}
      <div>
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-4">Recent Calls</h2>
        <div className="space-y-3">
          {calls.map((call, i) => (
            <motion.button
              key={call.id}
              onClick={() => onSelectCall(call)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full bg-white rounded-2xl px-5 py-4 border border-stone-100 shadow-soft hover:border-sage-200 hover:shadow-card transition-all duration-200 text-left flex items-center gap-5"
            >
              {/* Sparkline */}
              <div className="hidden sm:block shrink-0">
                <Sparkline
                  data={call.risk_timeline}
                  color={call.is_scam ? '#ef4444' : '#4e844a'}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-stone-800">{call.phone_number}</span>
                  {call.scam_type && (
                    <span className="text-xs text-stone-400 font-medium">· {call.scam_type}</span>
                  )}
                </div>
                <p className="text-xs text-stone-400">{fmt(call.timestamp)} · {fmtDuration(call.duration)}</p>
              </div>

              {/* Score + badge */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-extrabold text-stone-800">{call.risk_score}</span>
                <RiskBadge score={call.risk_score} />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

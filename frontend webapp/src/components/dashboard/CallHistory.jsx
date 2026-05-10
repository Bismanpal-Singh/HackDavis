import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import RiskBadge from './RiskBadge'

function fmt(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(s) {
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
function getDuration(entries) {
  if (!entries?.length) return 0
  return Math.round(entries[entries.length - 1].timestamp - entries[0].timestamp)
}

const FILTERS = ['All', 'Scam', 'Safe']

export default function CallHistory({ calls, onSelectCall }) {
  const [filter, setFilter] = useState('All')
  const [query, setQuery]   = useState('')

  const visible = calls.filter(c => {
    const matchFilter = filter === 'All' || (filter === 'Scam' ? c.is_scam : !c.is_scam)
    const scamType = c.latest_claude_result?.scam_type || ''
    const matchQuery  = query === '' || (c.phone_number || '').includes(query) || scamType.toLowerCase().includes(query.toLowerCase())
    return matchFilter && matchQuery
  })

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Call History</h1>
        <p className="text-sm text-stone-400 mt-1">All calls analyzed by ScamShield</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            type="text"
            placeholder="Search by number or type…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-100 rounded-xl outline-none transition-all"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                filter === f
                  ? 'bg-sage-500 text-white shadow-sm'
                  : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-soft overflow-hidden">
        {/* Table head */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-stone-100 bg-stone-50">
          {['Caller', 'Date', 'Duration', 'Score', 'Status'].map(h => (
            <span key={h} className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm">No calls match your filter.</div>
        ) : (
          visible.map((call, i) => (
            <motion.button
              key={call.id}
              onClick={() => onSelectCall(call)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4 border-b border-stone-50 hover:bg-sage-50/50 transition-colors text-left last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-stone-800">{call.caller_phone || 'Unknown'}</p>
                {call.latest_claude_result?.scam_type && (
                  <p className="text-xs text-stone-400 mt-0.5">{call.latest_claude_result.scam_type}</p>
                )}
              </div>
              <span className="text-xs text-stone-500 whitespace-nowrap">{fmt(call.created_at)}</span>
              <span className="text-xs text-stone-500 whitespace-nowrap">{fmtDuration(getDuration(call.transcript_entries))}</span>
              <span className="text-sm font-bold text-stone-700">{call.max_score}</span>
              <RiskBadge score={call.max_score} />
            </motion.button>
          ))
        )}
      </div>

      <p className="text-xs text-stone-400 mt-3">{visible.length} call{visible.length !== 1 ? 's' : ''} shown</p>
    </div>
  )
}

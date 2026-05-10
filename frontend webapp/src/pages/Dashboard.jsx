import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from '../components/dashboard/Sidebar'
import Overview from '../components/dashboard/Overview'
import CallHistory from '../components/dashboard/CallHistory'
import CallDetail from '../components/dashboard/CallDetail'
import Family from '../components/dashboard/Family'
import Settings from '../components/dashboard/Settings'
import { mockCalls } from '../data/mockCalls' // TODO: replace with API call

export default function Dashboard() {
  const [page, setPage]               = useState('overview')
  const [selectedCall, setSelectedCall] = useState(null)

  // TODO: fetch calls from backend → GET /api/calls?user_id=<google_sub>
  const calls = mockCalls

  const pageProps = { calls, onSelectCall: setSelectedCall }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={page} onNavigate={(p) => { setPage(p); setSelectedCall(null) }} />

      <main className="flex-1 overflow-y-auto">
        {page === 'overview' && <Overview {...pageProps} />}
        {page === 'history'  && <CallHistory {...pageProps} />}
        {page === 'family'   && <Family />}
        {page === 'settings' && <Settings />}
      </main>

      <AnimatePresence>
        {selectedCall && (
          <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

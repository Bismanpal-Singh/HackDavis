import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ShieldAlert, RefreshCw } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import Overview from '../components/dashboard/Overview'
import CallHistory from '../components/dashboard/CallHistory'
import CallDetail from '../components/dashboard/CallDetail'
import Family from '../components/dashboard/Family'
import Settings from '../components/dashboard/Settings'
import Academy from '../components/dashboard/Academy'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function CenteredMessage({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      {Icon && (
        <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon size={22} className="text-stone-400" />
        </div>
      )}
      <p className="text-sm font-bold text-stone-700 mb-1">{title}</p>
      <p className="text-xs text-stone-400 max-w-xs leading-relaxed mb-4">{body}</p>
      {action}
    </div>
  )
}

export default function Dashboard({ initialPage = 'overview' }) {
  const [page, setPage]                 = useState(initialPage)
  const [selectedCall, setSelectedCall] = useState(null)
  const [calls, setCalls]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchCalls = () => {
    const stored = localStorage.getItem('scamshield_user')
    if (!stored) {
      setError('not_logged_in')
      setLoading(false)
      return
    }
    const { sub } = JSON.parse(stored)
    setLoading(true)
    setError(null)
    fetch(`${BACKEND}/api/calls?google_sub=${encodeURIComponent(sub)}`)
      .then(r => {
        if (r.status === 404) throw new Error('not_registered')
        if (!r.ok) throw new Error('server_error')
        return r.json()
      })
      .then(data => setCalls(data))
      .catch(err => setError(err.message || 'server_error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCalls() }, [])

  const pageProps = { calls, onSelectCall: setSelectedCall }

  const callsContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-6 h-6 border-2 border-sage-300 border-t-sage-600 rounded-full animate-spin" />
        </div>
      )
    }
    if (error === 'not_logged_in') {
      return (
        <CenteredMessage
          icon={ShieldAlert}
          title="Not signed in"
          body="Sign in with Google to load your call reports."
          action={
            <a href="/login" className="text-xs font-bold text-sage-600 hover:text-sage-700 transition-colors">
              Go to sign in →
            </a>
          }
        />
      )
    }
    if (error === 'not_registered') {
      return (
        <CenteredMessage
          icon={ShieldAlert}
          title="Account not set up"
          body="Open the ScamShield mobile app and complete setup to link your phone number, then come back here."
        />
      )
    }
    if (error) {
      return (
        <CenteredMessage
          icon={ShieldAlert}
          title="Could not load calls"
          body="Make sure the backend is running and your connection is active."
          action={
            <button
              onClick={fetchCalls}
              className="flex items-center gap-1.5 text-xs font-bold text-sage-600 hover:text-sage-700 transition-colors"
            >
              <RefreshCw size={13} />
              Retry
            </button>
          }
        />
      )
    }
    return (
      <>
        {page === 'overview' && <Overview {...pageProps} />}
        {page === 'history'  && <CallHistory {...pageProps} />}
      </>
    )
  }

  const mainContent = () => {
    if (page === 'academy')  return <Academy />
    if (page === 'family')   return <Family />
    if (page === 'settings') return <Settings />
    return callsContent()
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden font-sans">
      <Sidebar activePage={page} onNavigate={(p) => { setPage(p); setSelectedCall(null) }} />
      <main className="flex-1 overflow-y-auto">{mainContent()}</main>
      <AnimatePresence>
        {selectedCall && (
          <CallDetail call={selectedCall} onClose={() => setSelectedCall(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

import { LayoutDashboard, PhoneCall, Users, Settings, LogOut, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import ShieldLogo from '../ShieldLogo'

function getUser() {
  try {
    const stored = localStorage.getItem('scamshield_user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const navItems = [
  { id: 'overview', label: 'Overview',     icon: LayoutDashboard },
  { id: 'history',  label: 'Call History', icon: PhoneCall },
  { id: 'academy',  label: 'Academy',      icon: GraduationCap },
  { id: 'family',   label: 'Family',       icon: Users },
  { id: 'settings', label: 'Settings',     icon: Settings },
]

export default function Sidebar({ activePage, onNavigate }) {
  const user = getUser()
  const displayName = user?.name || 'Guest'
  const displayEmail = user?.email || ''
  const initial = displayName.charAt(0).toUpperCase()

  const handleSignOut = () => {
    localStorage.removeItem('scamshield_user')
  }

  return (
    <aside className="w-56 shrink-0 h-screen bg-white border-r border-stone-100 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-stone-100">
        <Link to="/" className="flex items-center gap-2">
          <ShieldLogo size={24} />
          <span className="font-extrabold text-sage-800 text-base tracking-tight">ScamShield</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                active
                  ? 'bg-sage-50 text-sage-700'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
              }`}
            >
              <Icon size={16} className={active ? 'text-sage-600' : 'text-stone-400'} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-stone-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-7 h-7 bg-sage-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sage-700">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-stone-700 truncate">{displayName}</p>
            <p className="text-[10px] text-stone-400 truncate">{displayEmail}</p>
          </div>
        </div>
        <Link
          to="/"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-all mt-0.5"
        >
          <LogOut size={13} />
          Sign out
        </Link>
      </div>
    </aside>
  )
}

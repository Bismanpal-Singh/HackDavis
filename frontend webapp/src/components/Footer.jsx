import { Link } from 'react-router-dom'
import ShieldLogo from './ShieldLogo'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-100 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <ShieldLogo size={24} />
            <span className="text-base font-extrabold text-sage-800 tracking-tight">ScamShield</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-stone-400 font-medium">
            <Link to="/privacy" className="hover:text-stone-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-stone-600 transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-stone-600 transition-colors">Contact</Link>
          </div>

          {/* Tagline */}
          <p className="text-xs text-stone-400">
            Built for HackDavis 2025 &nbsp;·&nbsp; Protecting families, one call at a time.
          </p>
        </div>
      </div>
    </footer>
  )
}

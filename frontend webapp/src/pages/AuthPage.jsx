import { useState } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGoogleLogin } from '@react-oauth/google'
import { Eye, EyeOff, ArrowLeft, ShieldCheck, AudioLines, FileText, Users } from 'lucide-react'
import ShieldLogo from '../components/ShieldLogo'

// Isolated so useGoogleLogin hook errors don't bubble to the whole page
function GoogleLoginButton({ onSuccess }) {
  const login = useGoogleLogin({
    onSuccess,
    onError: (err) => console.error('Google login error:', err),
  })
  return (
    <button
      type="button"
      onClick={() => login()}
      className="w-full flex items-center justify-center gap-3 bg-white border border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-sm py-3.5 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
    >
      <GoogleIcon />
      Continue with Google
    </button>
  )
}

// Google "G" logo SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

const trustPoints = [
  { icon: ShieldCheck, text: 'Real-time scam detection on every call' },
  { icon: AudioLines,  text: 'Audio never leaves your device' },
  { icon: FileText,    text: 'Full post-call reports & FTC filing' },
  { icon: Users,       text: 'Family dashboard & instant alerts' },
]

const fadeSlide = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.2 } },
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState(
    pathname === '/signup' || searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  const isSignup = mode === 'signup'

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
      const profile = await res.json()
      localStorage.setItem('scamshield_user', JSON.stringify({
        sub:     profile.sub,
        email:   profile.email,
        name:    profile.name,
        picture: profile.picture,
      }))
    } catch (err) {
      console.error('Failed to fetch Google profile:', err)
    }
    navigate('/dashboard')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // TODO: wire to backend auth endpoint
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    navigate('/dashboard')
  }

  const field = (name) => ({
    value: form[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  })

  return (
    <div className="min-h-screen flex bg-cream-50">
      {/* ── Left panel ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-stone-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sage-800 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-sage-700 rounded-full opacity-10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 z-10 w-fit">
          <ShieldLogo size={28} />
          <span className="text-white font-extrabold text-lg tracking-tight">ScamShield</span>
        </Link>

        {/* Main copy */}
        <div className="z-10 max-w-sm">
          <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
            Every call,
            <br />
            <span className="text-sage-400">watched over.</span>
          </h1>
          <p className="text-stone-400 text-base leading-relaxed mb-10">
            ScamShield uses AI to score your calls in real time and alerts you — and your family — the moment something feels wrong.
          </p>

          <div className="space-y-4">
            {trustPoints.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sage-900 border border-sage-700 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-sage-400" />
                </div>
                <span className="text-stone-300 text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="z-10 border-l-2 border-sage-600 pl-4">
          <p className="text-stone-400 text-sm leading-relaxed">
            "In 2024, Americans reported losing{' '}
            <span className="text-stone-200 font-semibold">$12.5 billion to fraud</span>. Most of it
            started with a phone call."
          </p>
          <p className="text-stone-600 text-xs mt-2 font-medium">FTC Consumer Sentinel, 2024</p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <Link to="/" className="flex lg:hidden items-center gap-2 mb-8">
          <ShieldLogo size={24} />
          <span className="font-extrabold text-sage-800 text-base tracking-tight">ScamShield</span>
        </Link>

        <div className="w-full max-w-[400px]">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-stone-600 transition-colors mb-8"
          >
            <ArrowLeft size={13} />
            Back to home
          </Link>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div key={mode} {...fadeSlide}>
              <h2 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-1">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-stone-400 text-sm mb-8">
                {isSignup
                  ? 'Start protecting your calls in under a minute.'
                  : 'Sign in to access your dashboard and call reports.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Google button */}
          <div className="mb-5">
            <GoogleLoginButton onSuccess={handleGoogleSuccess} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-xs text-stone-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <InputField label="Full name" type="text" placeholder="Jane Smith" {...field('name')} />
                </motion.div>
              )}
            </AnimatePresence>

            <InputField label="Email address" type="email" placeholder="you@example.com" {...field('email')} />

            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignup ? 'Create a password' : 'Enter your password'}
              {...field('password')}
              suffix={
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-stone-400 hover:text-stone-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <AnimatePresence>
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <InputField
                    label="Confirm password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    {...field('confirm')}
                    suffix={
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-stone-400 hover:text-stone-600">
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {!isSignup && (
              <div className="flex justify-end -mt-1">
                <Link to="/forgot-password" className="text-xs text-sage-600 hover:text-sage-700 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-lg text-sm mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {isSignup ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                isSignup ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-stone-400 mt-6">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setMode(isSignup ? 'login' : 'signup')}
              className="text-sage-600 hover:text-sage-700 font-semibold transition-colors"
            >
              {isSignup ? 'Sign in' : 'Sign up free'}
            </button>
          </p>

          {/* Terms */}
          {isSignup && (
            <p className="text-center text-xs text-stone-300 mt-4 leading-relaxed">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="underline hover:text-stone-500">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline hover:text-stone-500">Privacy Policy</Link>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Reusable input field component
function InputField({ label, type, placeholder, value, onChange, suffix }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          className="w-full bg-stone-50 border border-stone-200 focus:border-sage-400 focus:bg-white focus:ring-2 focus:ring-sage-100 text-stone-800 placeholder:text-stone-300 text-sm px-4 py-3 rounded-2xl outline-none transition-all duration-200 pr-10"
        />
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
    </div>
  )
}

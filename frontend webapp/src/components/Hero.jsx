import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { PhoneCall, ShieldCheck, Zap } from 'lucide-react'
import ShieldLogo from './ShieldLogo'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
}

function ScoreCounter({ target, duration = 1.6 }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => Math.round(v))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const unsub = rounded.on('change', setDisplay)
    const controls = animate(count, target, { duration, ease: 'easeOut' })
    return () => { controls.stop(); unsub() }
  }, [target])

  return <span>{display}</span>
}

const PHASES = [
  { score: 12, pct: '12%', bar: 'from-sage-400 to-sage-500',     label: 'Safe',      labelColor: 'text-sage-600',  labelBg: 'bg-sage-50 border-sage-200' },
  { score: 48, pct: '48%', bar: 'from-sage-400 to-amber-400',    label: 'Caution',   labelColor: 'text-amber-600', labelBg: 'bg-amber-50 border-amber-200' },
  { score: 87, pct: '87%', bar: 'from-amber-400 to-red-500',     label: 'High Risk', labelColor: 'text-red-600',   labelBg: 'bg-red-50 border-red-200' },
]

const wait = (ms) => new Promise((res) => setTimeout(res, ms))

function PhoneMockup() {
  const [phase, setPhase] = useState(0)
  const [showAlert, setShowAlert] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      while (active) {
        setPhase(0); setShowAlert(false)
        await wait(2200); if (!active) return
        setPhase(1)
        await wait(2200); if (!active) return
        setPhase(2)
        await wait(1600); if (!active) return
        setShowAlert(true)
        await wait(3000); if (!active) return
      }
    })()
    return () => { active = false }
  }, [])

  const cur = PHASES[phase]

  return (
    <div className="relative flex justify-center items-center py-10">
      {/* Ambient glow */}
      <div className="absolute w-[28rem] h-[28rem] bg-sage-200 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Phone shell */}
      <div className="relative w-72 bg-white rounded-[2.75rem] shadow-card border border-stone-100 overflow-hidden">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-stone-900 rounded-b-2xl z-10" />

        {/* Header */}
        <div className="bg-stone-50 px-6 pt-9 pb-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-stone-400">9:41</span>
            <span className="text-xs font-semibold text-stone-400">●●● ▲</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-sage-100 rounded-full flex items-center justify-center shrink-0">
              <PhoneCall size={20} className="text-sage-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">Unknown Caller</p>
              <p className="text-xs text-stone-400 font-medium mt-0.5">+1 (555) 000-0000 · 0:43</p>
            </div>
          </div>
        </div>

        {/* Risk score section */}
        <div className="px-6 pt-5 pb-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Scam Risk Score</span>
            <motion.span
              key={cur.label}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cur.labelBg} ${cur.labelColor}`}
            >
              {cur.label}
            </motion.span>
          </div>

          {/* Big number */}
          <div className="flex items-end gap-1.5 mb-4">
            <span className="text-6xl font-extrabold text-stone-900 leading-none tabular-nums">
              <ScoreCounter key={phase} target={cur.score} duration={phase === 0 ? 0.4 : 1.5} />
            </span>
            <span className="text-2xl font-bold text-stone-300 mb-1.5">/100</span>
          </div>

          {/* Progress bar */}
          <div className="h-4 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${cur.bar} rounded-full`}
              animate={{ width: cur.pct }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="flex justify-between mt-2 px-0.5">
            {[0, 25, 50, 75, 100].map((v) => (
              <span key={v} className="text-[10px] text-stone-300 font-medium">{v}</span>
            ))}
          </div>
        </div>

        {/* Alert card */}
        <div className="px-5 pb-2">
          <motion.div
            animate={{ opacity: showAlert ? 1 : 0, y: showAlert ? 0 : 8, scale: showAlert ? 1 : 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldLogo size={15} />
              <span className="text-xs font-extrabold text-red-600">Scam Detected</span>
            </div>
            <p className="text-[11px] text-red-500 font-semibold">IRS Impersonation · Confidence 87%</p>
          </motion.div>
        </div>

        {/* Action button */}
        <div className="px-5 pt-2 pb-7">
          <motion.button
            animate={{
              backgroundColor: showAlert ? '#ef4444' : '#e7e5e4',
              color: showAlert ? '#ffffff' : '#78716c',
            }}
            transition={{ duration: 0.35 }}
            className="w-full text-xs font-bold py-3 rounded-2xl"
          >
            {showAlert ? '⚠ Hang Up Now' : 'End Call'}
          </motion.button>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        className="absolute -right-2 top-16 bg-white shadow-card border border-sage-100 rounded-2xl px-3 py-2 flex items-center gap-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      >
        <ShieldCheck size={15} className="text-sage-500" />
        <span className="text-xs font-semibold text-stone-700">Protected</span>
      </motion.div>

      <motion.div
        className="absolute -left-4 bottom-20 bg-white shadow-card border border-sage-100 rounded-2xl px-3 py-2 flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.5 }}
      >
        <Zap size={14} className="text-amber-500" />
        <span className="text-xs font-semibold text-stone-700">AI Analyzing</span>
      </motion.div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center pt-16 bg-cream-100">
      <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center w-full">
        <div>
          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="inline-flex items-center gap-2 bg-sage-100 text-sage-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
          >
            <ShieldLogo size={14} />
            Real-time AI scam detection
          </motion.div>

          <motion.h1
            variants={fadeUp} initial="hidden" animate="show" custom={1}
            className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-stone-800 mb-5"
          >
            Your guardian
            <br />
            <span className="text-sage-500">on every call.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={2}
            className="text-lg text-stone-500 leading-relaxed mb-8 max-w-md"
          >
            ScamShield scores every call in real time using AI, and alerts you the moment a scam is detected — keeping you and your family safe before a dollar is lost.
          </motion.p>

          <motion.div
            variants={fadeUp} initial="hidden" animate="show" custom={3}
            className="flex flex-wrap gap-3"
          >
            <a
              href="/signup"
              className="bg-sage-500 hover:bg-sage-600 text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md text-sm"
            >
              Get Started — It's Free
            </a>
            <a
              href="#how-it-works"
              className="border border-sage-200 hover:border-sage-300 text-stone-600 hover:text-sage-700 font-semibold px-7 py-3.5 rounded-full transition-all duration-200 text-sm bg-white"
            >
              See How It Works
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp} initial="hidden" animate="show" custom={4}
            className="mt-5 text-xs text-stone-400 font-medium"
          >
            No audio stored &nbsp;·&nbsp; FTC-verified patterns &nbsp;·&nbsp; Family dashboard included
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  )
}

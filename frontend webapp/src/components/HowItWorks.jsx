import { motion } from 'framer-motion'
import { PhoneIncoming, ScanLine, BellRing } from 'lucide-react'

const steps = [
  {
    icon: PhoneIncoming,
    step: '01',
    title: 'Receive a suspicious call',
    desc: 'Put your phone on speaker and open ScamShield. Tap "Protect This Call" — setup takes under 5 seconds.',
  },
  {
    icon: ScanLine,
    step: '02',
    title: 'AI listens in real time',
    desc: 'ScamShield transcribes the call live and runs it through our rule-based scorer and Claude AI to detect fraud patterns.',
  },
  {
    icon: BellRing,
    step: '03',
    title: 'Get alerted instantly',
    desc: 'If a scam is detected, you see a visual alert, hear a voice warning, and your trusted family contact is notified.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-sage-100 text-sage-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            How It Works
          </span>
          <h2 className="text-4xl font-extrabold text-stone-800 tracking-tight mb-4">
            Protection in three steps
          </h2>
          <p className="text-stone-500 max-w-md mx-auto text-base leading-relaxed">
            No complicated setup, no technical knowledge required. ScamShield works the moment you open it.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-sage-200 via-sage-300 to-sage-200" />

          {steps.map(({ icon: Icon, step, title, desc }, i) => (
            <motion.div
              key={step}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              custom={i}
              className="relative flex flex-col items-center text-center"
            >
              {/* Icon circle */}
              <div className="relative z-10 w-20 h-20 bg-cream-100 border-2 border-sage-200 rounded-full flex items-center justify-center mb-6 shadow-soft">
                <Icon size={26} className="text-sage-500" />
                <span className="absolute -top-1 -right-1 w-6 h-6 bg-sage-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-bold text-stone-800 mb-2">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

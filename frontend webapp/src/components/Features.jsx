import { motion } from 'framer-motion'
import {
  Brain, AlertTriangle, BarChart3, Share2, Flag, ShieldCheck
} from 'lucide-react'

const features = [
  {
    icon: ShieldCheck,
    title: 'Real-Time Risk Score',
    desc: 'Every call is scored 0–100 as it happens. The risk level updates continuously and alerts you the moment it crosses a danger threshold.',
    color: 'bg-sage-50 text-sage-600 border-sage-100',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Claude AI cross-references the transcript against 20+ FTC-documented scam scripts, classifying type, confidence, and flagged phrases.',
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: AlertTriangle,
    title: 'Instant Alert',
    desc: 'When a scam is confirmed, the screen flashes red, flagged phrases are highlighted, and an ElevenLabs voice warning plays immediately.',
    color: 'bg-red-50 text-red-500 border-red-100',
  },
  {
    icon: BarChart3,
    title: 'Post-Call Report',
    desc: "After the call, get a full risk timeline chart, color-coded transcript, and Claude's scam type explanation — all in one clean card.",
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    icon: Share2,
    title: 'Share with Family',
    desc: 'Export the report as a PDF or copy a shareable link to send to a trusted family member so they can review what happened.',
    color: 'bg-sage-50 text-sage-600 border-sage-100',
  },
  {
    icon: Flag,
    title: 'One-Tap FTC Report',
    desc: "File a scam complaint directly from your report with a single tap — opens a pre-filled FTC form so you're done in seconds.",
    color: 'bg-orange-50 text-orange-500 border-orange-100',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Features() {
  return (
    <section id="features" className="py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-sage-100 text-sage-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            Features
          </span>
          <h2 className="text-4xl font-extrabold text-stone-800 tracking-tight mb-4">
            Everything you need to stay safe
          </h2>
          <p className="text-stone-500 max-w-md mx-auto text-base leading-relaxed">
            From detection to documentation — ScamShield covers the full lifecycle of a scam call.
          </p>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={i}
              className="bg-white rounded-3xl p-6 shadow-soft border border-stone-100 hover:shadow-card transition-shadow duration-300"
            >
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-bold text-stone-800 mb-2 text-base">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

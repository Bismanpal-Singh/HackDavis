import { motion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'
import ShieldLogo from './ShieldLogo'

const steps = [
  { time: '~10 sec', label: 'Download & sign in' },
  { time: '~10 sec', label: 'Add a trusted family contact' },
  { time: '~10 sec', label: 'Tap "Protect This Call"' },
]

export default function CTASection() {
  return (
    <section className="py-24 bg-cream-100">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2.5rem] overflow-hidden grid md:grid-cols-[1fr_auto] shadow-card"
        >
          {/* Left: dark panel */}
          <div className="bg-stone-900 px-10 py-14 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-sage-800 rounded-full opacity-20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 right-0 w-64 h-64 bg-sage-700 rounded-full opacity-10 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-8">
                <ShieldLogo size={28} className="[&_path]:stroke-sage-400 [&_path:first-child]:fill-sage-900" />
                <span className="text-sage-400 font-bold text-sm tracking-tight">ScamShield</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
                Don't wait for
                <br />
                <span className="text-sage-400">the call that costs</span>
                <br />
                everything.
              </h2>

              <p className="text-stone-400 text-base leading-relaxed mb-10 max-w-sm">
                In 2024, Americans lost{' '}
                <span className="text-stone-200 font-semibold">$12.5 billion to fraud</span>.
                ScamShield intervenes during the call, explains what's suspicious, and preserves
                evidence for reporting — all before a dollar is transferred.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-sage-500 hover:bg-sage-400 text-white font-bold px-7 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-sage-900/40 text-sm group"
                >
                  Get Started Free
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 text-sm"
                >
                  Log In
                </a>
              </div>
            </div>
          </div>

          {/* Right: setup card */}
          <div className="bg-white px-10 py-14 flex flex-col justify-center md:w-80">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">
              Up and running in
            </p>
            <p className="text-5xl font-extrabold text-stone-900 tracking-tight mb-8">
              30<span className="text-sage-500">s</span>
            </p>

            <div className="space-y-5 mb-10">
              {steps.map(({ time, label }, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-sage-100 rounded-full flex items-center justify-center shrink-0">
                    <Check size={13} className="text-sage-600" strokeWidth={3} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{label}</p>
                    <p className="text-xs text-stone-400">{time}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-stone-100">
              <p className="text-xs text-stone-400 leading-relaxed">
                No credit card required.
                <br />
                Works on any modern smartphone browser.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

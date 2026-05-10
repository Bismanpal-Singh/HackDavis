import { motion } from 'framer-motion'
import { Heart, Bell, ClipboardList, PhoneCall } from 'lucide-react'

const points = [
  {
    icon: Bell,
    title: 'Instant notifications',
    desc: "Get alerted the moment ScamShield detects a threat on your loved one's call — before they hang up.",
  },
  {
    icon: ClipboardList,
    title: 'Full call reports',
    desc: 'View the complete risk timeline, AI explanation, and scam type breakdown after every flagged call.',
  },
  {
    icon: PhoneCall,
    title: 'One trusted contact',
    desc: 'Set up in 30 seconds — add a name and phone number. No separate app needed on the family side.',
  },
]

export default function ForFamilies() {
  return (
    <section id="families" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-500 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
              <Heart size={12} />
              For Families
            </span>
            <h2 className="text-4xl font-extrabold text-stone-800 tracking-tight mb-5 leading-tight">
              Protect the people
              <br />you care about most.
            </h2>
            <p className="text-stone-500 text-base leading-relaxed mb-8">
              Scammers specifically target older adults — and phone calls are their weapon of choice.
              ScamShield gives families a real-time line of defense without taking away independence.
            </p>

            <div className="space-y-5">
              {points.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-sage-100 rounded-2xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-sage-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800 text-sm mb-0.5">{title}</p>
                    <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: stat cards */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4"
          >
            <div className="bg-cream-100 rounded-3xl p-7 border border-cream-300">
              <p className="text-5xl font-extrabold text-sage-500 mb-2">147K+</p>
              <p className="text-sm text-stone-600 font-medium mb-1">fraud complaints from adults over 60</p>
              <p className="text-xs text-stone-400">The most complaints of any age group, FBI IC3 2024</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sage-50 rounded-3xl p-6 border border-sage-100">
                <p className="text-3xl font-extrabold text-sage-600 mb-1">$1.9B</p>
                <p className="text-xs text-stone-500 leading-relaxed">lost via calls, texts & email in 2024</p>
                <p className="text-[10px] text-stone-400 mt-2">FTC, 2024</p>
              </div>
              <div className="bg-cream-100 rounded-3xl p-6 border border-cream-300">
                <p className="text-3xl font-extrabold text-stone-700 mb-1">5×</p>
                <p className="text-xs text-stone-500 leading-relaxed">rise in text scam losses since 2020</p>
                <p className="text-[10px] text-stone-400 mt-2">FTC, 2024</p>
              </div>
            </div>

            <div className="bg-sage-500 rounded-3xl p-6 text-white">
              <p className="text-base font-bold mb-1">Built on FTC-documented scam scripts</p>
              <p className="text-sm text-sage-100 leading-relaxed">
                ScamShield's AI is grounded in 20+ real patterns from FTC complaints — IRS
                impersonation, tech support fraud, bank scams, and more.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

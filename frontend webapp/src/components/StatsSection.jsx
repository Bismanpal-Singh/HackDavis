import { motion } from 'framer-motion'

const stats = [
  {
    figure: '$12.5B+',
    label: 'lost to fraud in 2024',
    detail: 'A 25% increase from the prior year',
    source: 'FTC Consumer Sentinel, 2024',
  },
  {
    figure: '$2.95B',
    label: 'lost to imposter scams alone',
    detail: 'Callers posing as banks, IRS, tech support, or family',
    source: 'FTC Consumer Sentinel, 2024',
  },
  {
    figure: '845K+',
    label: 'imposter scam reports filed',
    detail: '22% of reports included a dollar loss',
    source: 'FTC Consumer Sentinel, 2024',
  },
  {
    figure: '$4.8B',
    label: 'lost by adults over 60',
    detail: 'The highest-loss age group, per FBI data',
    source: 'FBI IC3 Report, 2024',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function StatsSection() {
  return (
    <section className="py-24 bg-stone-900">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <span className="inline-block bg-sage-900 text-sage-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            Why ScamShield Exists
          </span>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2 className="text-4xl font-extrabold text-white tracking-tight max-w-lg leading-tight">
              The numbers behind
              <span className="text-sage-400"> every call.</span>
            </h2>
            <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
              Scam calls work because they create panic in the moment. These are the real stakes.
            </p>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {stats.map(({ figure, label, detail, source }, i) => (
            <motion.div
              key={figure}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={i}
              className="bg-stone-800 rounded-3xl p-6 border border-stone-700 flex flex-col justify-between min-h-[180px]"
            >
              <div>
                <p className="text-4xl font-extrabold text-sage-400 mb-2 tracking-tight">{figure}</p>
                <p className="text-base font-semibold text-white mb-1">{label}</p>
                <p className="text-sm text-stone-400 leading-relaxed">{detail}</p>
              </div>
              <p className="text-[10px] text-stone-600 font-medium mt-4 uppercase tracking-wide">{source}</p>
            </motion.div>
          ))}
        </div>

        {/* Pull quote */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="border-l-4 border-sage-500 pl-6 py-1"
        >
          <p className="text-stone-300 text-base leading-relaxed max-w-3xl">
            "Among older adults who reported losing{' '}
            <span className="text-white font-semibold">$10,000 or more</span> to a government or
            business imposter scam, <span className="text-white font-semibold">41% said the scam
            started with a phone call.</span> ScamShield is built to intervene during the call —
            before a dollar is transferred."
          </p>
          <p className="text-stone-500 text-xs font-medium mt-3">FTC Data Spotlight, 2024</p>
        </motion.div>
      </div>
    </section>
  )
}

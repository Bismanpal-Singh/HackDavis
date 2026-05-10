import { motion } from 'framer-motion'
import { GraduationCap, PhoneCall, Globe, Trophy, BookOpen, AlertTriangle, ChevronRight, Mic } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
}

const pillars = [
  {
    icon: Mic,
    title: 'ElevenLabs AI Tutors',
    desc: 'Voice-powered tutors explain scam tactics conversationally — ask questions, get answers, learn at your own pace.',
    color: 'bg-violet-50 text-violet-600 border-violet-100',
  },
  {
    icon: PhoneCall,
    title: 'Simulated Scam Calls',
    desc: 'Practice recognizing live scam scenarios through realistic call simulations before a real one ever reaches you.',
    color: 'bg-red-50 text-red-500 border-red-100',
  },
  {
    icon: BookOpen,
    title: 'Labeled Scam Library',
    desc: 'Browse a curated, categorized library of real scam types — IRS, grandparent, lottery, tech support, and more.',
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
  {
    icon: AlertTriangle,
    title: 'Red Flag Reports',
    desc: 'After each quiz or simulation, get a detailed breakdown of every red flag you missed and why it matters.',
    color: 'bg-orange-50 text-orange-500 border-orange-100',
  },
  {
    icon: Trophy,
    title: 'Score History',
    desc: 'Track your progress over time. Your quiz results and simulation scores are saved to revisit and improve on.',
    color: 'bg-sage-50 text-sage-600 border-sage-100',
  },
  {
    icon: Globe,
    title: 'Multilingual',
    desc: 'Learn in your preferred language. Academy supports multiple languages so every family member can participate.',
    color: 'bg-blue-50 text-blue-500 border-blue-100',
  },
]

// Mock quiz card for visual
function QuizCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-3xl border border-stone-100 shadow-card p-6 w-full max-w-sm mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
          <GraduationCap size={15} className="text-violet-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-stone-700">IRS Impersonation</p>
          <p className="text-[10px] text-stone-400">Lesson 3 of 8 · Intermediate</p>
        </div>
        <span className="ml-auto text-[10px] font-bold bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">EN</span>
      </div>

      {/* Question */}
      <div className="bg-stone-50 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-stone-500 mb-1">AI Tutor asks:</p>
        <p className="text-sm font-bold text-stone-800 leading-snug">
          "The caller says your Social Security number has been suspended. What should you do first?"
        </p>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {[
          { text: 'Ask them to verify their badge number', correct: false },
          { text: 'Hang up and call the SSA directly', correct: true },
          { text: 'Provide your SSN to clear the suspension', correct: false },
        ].map(({ text, correct }, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-default ${
              correct
                ? 'bg-sage-50 border-sage-200 text-sage-700'
                : 'bg-white border-stone-100 text-stone-500'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${correct ? 'bg-sage-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
              {String.fromCharCode(65 + i)}
            </span>
            {text}
            {correct && <ChevronRight size={12} className="ml-auto text-sage-500" />}
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="flex items-center justify-between text-[10px] text-stone-400 font-medium">
        <span>Session score</span>
        <span className="font-bold text-sage-600">8 / 10 correct</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full mt-1 overflow-hidden">
        <div className="h-full w-4/5 bg-gradient-to-r from-sage-400 to-sage-500 rounded-full" />
      </div>
    </motion.div>
  )
}

export default function Academy() {
  return (
    <section id="academy" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} custom={0}
          >
            <span className="inline-block bg-violet-100 text-violet-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              ScamShield Academy
            </span>
            <h2 className="text-4xl font-extrabold text-stone-800 tracking-tight mb-4 leading-tight">
              Learn to spot scams<br />
              <span className="text-violet-500">before they happen.</span>
            </h2>
            <p className="text-stone-500 text-base leading-relaxed mb-6 max-w-md">
              Academy pairs ElevenLabs voice AI with prompt-engineered scam tutors to train you and your family through quizzes, simulations, and real scam scripts — in any language.
            </p>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-full transition-all duration-200 text-sm shadow-sm"
            >
              <GraduationCap size={15} />
              Start Learning Free
            </a>
          </motion.div>

          <QuizCard />
        </div>

        {/* Pillars grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillars.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              custom={i}
              className="bg-stone-50 rounded-3xl p-6 border border-stone-100 hover:shadow-soft transition-shadow duration-300"
            >
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <h3 className="font-bold text-stone-800 mb-1.5 text-sm">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

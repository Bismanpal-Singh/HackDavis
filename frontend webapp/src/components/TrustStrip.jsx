import { ShieldCheck, AudioLines, Users, FileText } from 'lucide-react'

const items = [
  { icon: AudioLines,  label: 'Audio never leaves your device' },
  { icon: ShieldCheck, label: 'FTC-verified scam patterns' },
  { icon: FileText,    label: 'Automatic post-call reports' },
  { icon: Users,       label: 'Family dashboard & call logs' },
]

export default function TrustStrip() {
  return (
    <section className="bg-sage-500 py-5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-3">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sage-50">
              <Icon size={15} className="opacity-80 shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

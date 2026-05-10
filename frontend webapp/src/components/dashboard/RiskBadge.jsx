export default function RiskBadge({ score, size = 'sm' }) {
  const cfg =
    score >= 60
      ? { label: 'High Risk', cls: 'bg-red-50 text-red-600 border-red-200' }
      : score >= 30
      ? { label: 'Caution',   cls: 'bg-amber-50 text-amber-600 border-amber-200' }
      : { label: 'Safe',      cls: 'bg-sage-50 text-sage-700 border-sage-200' }

  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${cfg.cls} ${pad}`}>
      {cfg.label}
    </span>
  )
}

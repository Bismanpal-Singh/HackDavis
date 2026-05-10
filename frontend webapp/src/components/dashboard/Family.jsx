import { UserPlus, PhoneCall, Clock } from 'lucide-react'
import { mockFamily } from '../../data/mockCalls' // TODO: replace with API

export default function Family() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Family</h1>
        <p className="text-sm text-stone-400 mt-1">Monitor call protection across your family members</p>
      </div>

      {/* Linked members */}
      {mockFamily.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Linked Members</h2>
          <div className="space-y-3">
            {mockFamily.map(member => (
              <div key={member.id} className="bg-white rounded-2xl px-5 py-4 border border-stone-100 shadow-soft flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-sage-100 rounded-full flex items-center justify-center font-bold text-sage-700 text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{member.name}</p>
                    <p className="text-xs text-stone-400">{member.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1"><PhoneCall size={11} /> {member.callCount} call{member.callCount !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {member.lastSeen}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add member CTA */}
      <div className="bg-cream-100 rounded-3xl border border-cream-300 border-dashed p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4">
          <UserPlus size={20} className="text-sage-600" />
        </div>
        <h3 className="text-base font-bold text-stone-800 mb-2">Add a family member</h3>
        <p className="text-sm text-stone-400 leading-relaxed max-w-sm mb-6">
          Link a family member's ScamShield account so you can view their call reports and get alerts when a scam is detected on their calls.
        </p>
        <button
          disabled
          className="bg-sage-500 text-white text-sm font-bold px-6 py-2.5 rounded-full opacity-50 cursor-not-allowed"
          title="Coming soon — requires backend"
        >
          Send Invite Link
        </button>
        <p className="text-xs text-stone-400 mt-3">Family linking coming soon</p>
      </div>
    </div>
  )
}

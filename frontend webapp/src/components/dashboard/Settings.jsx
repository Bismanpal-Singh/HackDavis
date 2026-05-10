import { useState } from 'react'
import { Save } from 'lucide-react'

export default function Settings() {
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    // TODO: POST /api/settings { trusted_contact: contact }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Settings</h1>
        <p className="text-sm text-stone-400 mt-1">Configure your protection preferences</p>
      </div>

      {/* Trusted contact */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6 mb-5">
        <h2 className="text-sm font-bold text-stone-800 mb-1">Trusted Contact</h2>
        <p className="text-xs text-stone-400 mb-5 leading-relaxed">
          This person gets a notification when a scam is detected on your call. One contact max.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Jane Smith"
              value={contact.name}
              onChange={e => setContact(c => ({ ...c, name: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-100 text-stone-800 placeholder:text-stone-300 text-sm px-4 py-2.5 rounded-xl outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Phone Number</label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={contact.phone}
              onChange={e => setContact(c => ({ ...c, phone: e.target.value }))}
              className="w-full bg-stone-50 border border-stone-200 focus:border-sage-400 focus:ring-2 focus:ring-sage-100 text-stone-800 placeholder:text-stone-300 text-sm px-4 py-2.5 rounded-xl outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-sage-500 hover:bg-sage-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save Contact'}
          </button>
        </form>
      </div>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6">
        <h2 className="text-sm font-bold text-stone-800 mb-1">Account</h2>
        <p className="text-xs text-stone-400 mb-4">Signed in via Google. Your call data is linked to this account.</p>
        <div className="flex items-center justify-between py-3 border-t border-stone-50">
          <span className="text-xs font-medium text-stone-500">Delete all call data</span>
          <button
            disabled
            className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors opacity-50 cursor-not-allowed"
            title="Coming soon"
          >
            Delete — coming soon
          </button>
        </div>
      </div>
    </div>
  )
}

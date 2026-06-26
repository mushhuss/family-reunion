// Modal listing point-of-contact people for the selected reunion year.
// max-h-[85vh] + overflow-y-auto on the contacts list ensures scrollability on mobile
// without the header scrolling away — the title/close button stays pinned at the top.
import { useEffect, useState } from 'react'
import { X, Phone, Mail } from 'lucide-react'
import { getContacts } from '../lib/api'
import type { Contact } from '../lib/types'

interface Props {
  year: string
  onClose: () => void
}

export default function ContactsModal({ year, onClose }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([])

  useEffect(() => {
    getContacts(year).then(setContacts)
  }, [year])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Fixed header */}
        <div className="px-8 pt-8 pb-4 shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-crayon text-3xl text-gray-800 mb-1">Point of Contacts</h2>
          <p className="text-sm text-gray-500">Reach out to our event coordinators</p>
        </div>

        {/* Scrollable contacts list */}
        <div className="overflow-y-auto px-8 pb-8">
          {contacts.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No contacts listed yet.</p>
          ) : (
            <ul className="space-y-4 pt-2">
              {contacts.map(c => (
                <li key={c.id} className="rounded-xl border border-reunion-100 bg-reunion-50 p-4">
                  <div className="font-semibold text-gray-800">{c.name}</div>
                  <div className="text-sm font-medium text-reunion-600 mb-2">{c.role}</div>
                  <div className="flex flex-col gap-1">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-reunion-600 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-reunion-600 transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {c.email}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

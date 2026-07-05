import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Trash2, Save, Loader2, Pencil, X, PlayCircle, GripVertical } from 'lucide-react'
import {
  getReunions, createReunion, deleteReunion, updateReunion,
  getProgram, createProgramEvent, deleteProgramEvent, updateProgramEvent,
  getLinks, createLink, deleteLink, updateLink,
  getContacts, createContact, deleteContact, updateContact,
  getPhotos, deleteMedia,
} from '../../lib/api'
import type { Reunion, ProgramEvent, Link, Contact, Media } from '../../lib/types'
import { THEMES } from '../../lib/themes'

type Tab = 'reunions' | 'program' | 'links' | 'contacts' | 'media'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('reunions')
  const token = sessionStorage.getItem('adminToken') ?? ''

  useEffect(() => {
    if (!token) navigate('/admin')
  }, [token, navigate])

  const logout = () => {
    sessionStorage.removeItem('adminToken')
    navigate('/admin')
  }

  return (
    <div className="font-readable min-h-screen bg-reunion-50">
      <header className="border-b border-reunion-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="font-display text-lg font-bold text-gray-800 sm:text-xl">Admin Dashboard</h1>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex gap-1 mb-6 border-b border-reunion-100 overflow-x-auto sm:gap-2 sm:mb-8">
          {(['reunions', 'program', 'links', 'contacts', 'media'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px whitespace-nowrap sm:px-4 ${
                tab === t
                  ? 'border-reunion-500 text-reunion-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'reunions' && <ReunionsTab token={token} />}
        {tab === 'program'  && <ProgramTab  token={token} />}
        {tab === 'links'    && <LinksTab    token={token} />}
        {tab === 'contacts' && <ContactsTab token={token} />}
        {tab === 'media'    && <MediaTab    token={token} />}
      </div>
    </div>
  )
}

// ─── Reunions ────────────────────────────────────────────────────────────────

const REUNION_BLANK = { year: '', title: '', welcome_message: '', hero_image_url: '', theme_slug: 'default', start_date: '', status: 'active', youtube_url: '' }

function ReunionsTab({ token }: { token: string }) {
  const [rows, setRows] = useState<Reunion[]>([])
  const [form, setForm] = useState(REUNION_BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => getReunions().then(setRows)
  useEffect(() => { load() }, [])

  const startEdit = (r: Reunion) => {
    setEditId(r.id)
    setForm({ year: String(r.year), title: r.title ?? '', welcome_message: r.welcome_message ?? '', hero_image_url: r.hero_image_url ?? '', theme_slug: r.theme_slug ?? 'default', start_date: r.start_date ?? '', status: r.status ?? 'active', youtube_url: r.youtube_url ?? '' })
  }

  const cancelEdit = () => { setEditId(null); setForm(REUNION_BLANK) }

  const save = async () => {
    setSaving(true)
    try {
      const reunionBody = { ...form, year: Number(form.year), start_date: form.start_date || null, youtube_url: form.youtube_url || null }
      if (editId) {
        await updateReunion(editId, reunionBody, token)
        cancelEdit()
      } else {
        await createReunion(reunionBody, token)
        setForm(REUNION_BLANK)
      }
      await load()
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this reunion and all its data?')) return
    await deleteReunion(id, token)
    await load()
  }

  return (
    <div className="space-y-6">
      <FormCard title={editId ? 'Edit Reunion' : 'Add Reunion Year'} onCancel={editId ? cancelEdit : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Year (e.g. 2026)" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={field} />
          <input placeholder="Title (e.g. 2026 Hussaini Reunion)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={field} />
          <textarea placeholder="Welcome message" value={form.welcome_message} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} className={`${field} sm:col-span-2`} rows={3} />
          <input placeholder="Hero image URL (optional)" value={form.hero_image_url} onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))} className={`${field} sm:col-span-2`} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Reunion start date (first day — usually Thursday)</label>
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className={field} />
            <p className="text-xs text-gray-400">Sets Thu–Mon day pills in the Programs tab</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Theme</label>
            <select value={form.theme_slug} onChange={e => setForm(f => ({ ...f, theme_slug: e.target.value }))} className={field}>
              {Object.entries(THEMES).map(([slug, t]) => (
                <option key={slug} value={slug}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Reunion status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={field}>
              <option value="active">Active — uploads open</option>
              <option value="locked">Locked — uploads closed</option>
              <option value="archived">Archived — show slideshow</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">
              {form.status === 'active' && 'Family members can upload photos and videos.'}
              {form.status === 'locked' && 'Gallery is still visible but uploads are disabled.'}
              {form.status === 'archived' && 'Gallery is hidden — paste a YouTube URL below to show the slideshow instead.'}
            </p>
          </div>
          {form.status === 'archived' && (
            <input
              placeholder="YouTube URL (e.g. https://youtu.be/abc123)"
              value={form.youtube_url}
              onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              className={`${field} sm:col-span-2`}
            />
          )}
        </div>
        <SaveBtn onClick={save} loading={saving} disabled={!form.year || !form.title} label={editId ? 'Update' : 'Save'} />

      </FormCard>
      <Table<Reunion> rows={rows} onDelete={remove} onEdit={startEdit} columns={['year', 'title', 'status']} />
    </div>
  )
}

// ─── Program ─────────────────────────────────────────────────────────────────

const PROGRAM_BLANK = { title: '', description: '', event_date: '', start_time: '', end_time: '', location: '', sort_order: '0' }

const REUNION_DAY_LABELS = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon']

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const DAY_TAB_COLORS = ['#DC2626', '#D97706', '#16A34A', '#2563EB', '#9333EA']

function ProgramTab({ token }: { token: string }) {
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [rows, setRows] = useState<ProgramEvent[]>([])
  const [rid, setRid] = useState('')
  const [form, setForm] = useState(PROGRAM_BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<string>('')

  const dayOptions = useMemo(() => {
    const reunion = reunions.find(r => r.id === rid)
    if (!reunion?.start_date) return null
    return REUNION_DAY_LABELS.map((label, i) => {
      const date = addDays(reunion.start_date!, i)
      return { label, date, sub: new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) }
    })
  }, [reunions, rid])

  useEffect(() => {
    getReunions().then(data => { setReunions(data); if (data[0]) setRid(data[0].id) })
  }, [])

  // Auto-select first day when reunion changes
  useEffect(() => {
    if (!rid) return
    const reunion = reunions.find(r => r.id === rid)
    if (reunion?.start_date) {
      const firstDate = addDays(reunion.start_date, 0)
      setActiveDay(firstDate)
      setEditId(null)
      setForm({ ...PROGRAM_BLANK, event_date: firstDate })
    } else {
      setActiveDay('')
      setEditId(null)
      setForm(PROGRAM_BLANK)
    }
  }, [rid])

  const load = (id: string) => {
    const year = reunions.find(r => r.id === id)?.year.toString() ?? ''
    if (year) getProgram(year).then(setRows)
  }
  useEffect(() => { if (rid) load(rid) }, [rid])

  const switchDay = (date: string) => {
    setActiveDay(date)
    if (!editId) {
      setForm(f => ({ ...f, event_date: date === 'tbd' ? '' : date }))
    }
  }

  const orderedRows = useMemo(() => {
    if (!dragId || !dragOverId || dragId === dragOverId) return rows
    const next = [...rows]
    const from = next.findIndex(r => r.id === dragId)
    const to = next.findIndex(r => r.id === dragOverId)
    if (from === -1 || to === -1) return rows
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }, [rows, dragId, dragOverId])

  const filteredRows = useMemo(() => {
    if (!dayOptions || !activeDay) return orderedRows
    if (activeDay === 'tbd') return orderedRows.filter(r => !r.event_date)
    return orderedRows.filter(r => r.event_date === activeDay)
  }, [orderedRows, activeDay, dayOptions])

  const handleDrop = async () => {
    if (!dragId || !dragOverId || dragId === dragOverId) {
      setDragId(null); setDragOverId(null); return
    }
    const next = [...rows]
    const from = next.findIndex(r => r.id === dragId)
    const to = next.findIndex(r => r.id === dragOverId)
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setRows(next)
    setDragId(null); setDragOverId(null)
    await Promise.all(next.map((r, i) => updateProgramEvent(r.id, { sort_order: i }, token)))
  }

  const startEdit = (e: ProgramEvent) => {
    setEditId(e.id)
    if (dayOptions) setActiveDay(e.event_date ?? 'tbd')
    setForm({
      title: e.title ?? '',
      description: e.description ?? '',
      event_date: e.event_date ?? '',
      start_time: e.start_time ?? '',
      end_time: e.end_time ?? '',
      location: e.location ?? '',
      sort_order: String(e.sort_order ?? 0),
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setForm({ ...PROGRAM_BLANK, event_date: activeDay && activeDay !== 'tbd' ? activeDay : '' })
  }

  const save = async () => {
    setSaving(true)
    try {
      const body = { ...form, sort_order: Number(form.sort_order) || 0 }
      const dateForDay = activeDay && activeDay !== 'tbd' ? activeDay : ''
      if (editId) {
        await updateProgramEvent(editId, body, token)
        setEditId(null)
      } else {
        await createProgramEvent(rid, body, token)
      }
      setForm({ ...PROGRAM_BLANK, event_date: dateForDay })
      load(rid)
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => { await deleteProgramEvent(id, token); load(rid) }

  return (
    <div className="space-y-6">
      <ReunionPicker reunions={reunions} value={rid} onChange={setRid} />
      <FormCard title={editId ? 'Edit Event' : 'Add Event'} onCancel={editId ? cancelEdit : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Title*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={`${field} sm:col-span-2`} />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${field} sm:col-span-2`} rows={2} />
          {dayOptions ? (
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-400 mb-2 block">Day of reunion</label>
              <div className="flex gap-2 flex-wrap">
                {dayOptions.map(({ label, date, sub }) => {
                  const isSelected = form.event_date === date
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, event_date: isSelected ? '' : date }))}
                      className={`rounded-lg px-3 py-2 text-center border-2 transition-colors min-w-[58px] ${
                        isSelected ? 'bg-reunion-600 text-white border-reunion-600' : 'bg-white text-gray-600 border-gray-200 hover:border-reunion-400 hover:text-reunion-600'
                      }`}
                    >
                      <div className="text-sm font-semibold">{label}</div>
                      <div className="text-xs opacity-75">{sub}</div>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, event_date: '' }))}
                  className={`rounded-lg px-3 py-2 text-center border-2 transition-colors min-w-[58px] ${
                    !form.event_date ? 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="text-sm font-semibold">TBD</div>
                  <div className="text-xs opacity-75">No date</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Date (set a start date on the reunion to get day pills instead)</label>
              <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className={field} />
            </div>
          )}
          <input placeholder="Location (optional)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={field} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Start time (optional)</label>
            <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={field} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">End time (optional)</label>
            <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={field} />
          </div>
        </div>
        <SaveBtn onClick={save} loading={saving} disabled={!form.title || !rid} label={editId ? 'Update' : 'Save'} />
      </FormCard>

      {/* Day filter tabs */}
      {dayOptions && (
        <div className="flex gap-2 flex-wrap">
          {dayOptions.map(({ label, date, sub }, i) => {
            const isActive = activeDay === date
            const color = DAY_TAB_COLORS[i % DAY_TAB_COLORS.length]
            return (
              <button
                key={date}
                onClick={() => switchDay(date)}
                className="rounded-full px-4 py-2 text-sm font-medium transition-all border-2"
                style={{ backgroundColor: isActive ? color : 'transparent', borderColor: color, color: isActive ? 'white' : color }}
              >
                {label} · {sub}
              </button>
            )
          })}
          <button
            onClick={() => switchDay('tbd')}
            className="rounded-full px-4 py-2 text-sm font-medium transition-all border-2"
            style={{ backgroundColor: activeDay === 'tbd' ? '#6B7280' : 'transparent', borderColor: '#6B7280', color: activeDay === 'tbd' ? 'white' : '#6B7280' }}
          >
            General
          </button>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          {dayOptions ? 'No events for this day yet.' : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="rounded-xl bg-white shadow-sm border border-reunion-100 overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-xs text-gray-400">Drag to reorder</p>
          {filteredRows.map(row => (
            <div
              key={row.id}
              draggable
              onDragStart={() => setDragId(row.id)}
              onDragOver={e => { e.preventDefault(); setDragOverId(row.id) }}
              onDrop={handleDrop}
              onDragEnd={() => { setDragId(null); setDragOverId(null) }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors select-none cursor-grab active:cursor-grabbing ${
                dragId === row.id ? 'opacity-40' : ''
              } ${dragOverId === row.id && dragId !== row.id ? 'bg-reunion-100' : 'hover:bg-reunion-50'}`}
            >
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">{row.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {[row.event_date, row.start_time, row.location].filter(Boolean).join(' · ') || 'No date or time set'}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(row)} className="rounded-lg p-1.5 text-gray-400 hover:bg-reunion-50 hover:text-reunion-600 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(row.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Links ───────────────────────────────────────────────────────────────────

const LINK_BLANK = { title: '', url: '', description: '', sort_order: '0' }

function LinksTab({ token }: { token: string }) {
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [rows, setRows] = useState<Link[]>([])
  const [rid, setRid] = useState('')
  const [form, setForm] = useState(LINK_BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    getReunions().then(data => { setReunions(data); if (data[0]) setRid(data[0].id) })
  }, [])

  const load = (id: string) => {
    const year = reunions.find(r => r.id === id)?.year.toString() ?? ''
    if (year) getLinks(year).then(setRows)
  }
  useEffect(() => { if (rid) load(rid) }, [rid])

  const orderedRows = useMemo(() => {
    if (!dragId || !dragOverId || dragId === dragOverId) return rows
    const next = [...rows]
    const from = next.findIndex(r => r.id === dragId)
    const to = next.findIndex(r => r.id === dragOverId)
    if (from === -1 || to === -1) return rows
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
  }, [rows, dragId, dragOverId])

  const handleDrop = async () => {
    if (!dragId || !dragOverId || dragId === dragOverId) {
      setDragId(null); setDragOverId(null); return
    }
    const next = [...rows]
    const from = next.findIndex(r => r.id === dragId)
    const to = next.findIndex(r => r.id === dragOverId)
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setRows(next)
    setDragId(null); setDragOverId(null)
    await Promise.all(next.map((r, i) => updateLink(r.id, { sort_order: i }, token)))
  }

  const startEdit = (l: Link) => {
    setEditId(l.id)
    setForm({ title: l.title ?? '', url: l.url ?? '', description: l.description ?? '', sort_order: String(l.sort_order ?? 0) })
  }

  const cancelEdit = () => { setEditId(null); setForm(LINK_BLANK) }

  const save = async () => {
    setSaving(true)
    try {
      const body = { ...form, sort_order: Number(form.sort_order) || 0 }
      if (editId) {
        await updateLink(editId, body, token)
        cancelEdit()
      } else {
        await createLink(rid, body, token)
        setForm(LINK_BLANK)
      }
      load(rid)
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => { await deleteLink(id, token); load(rid) }

  return (
    <div className="space-y-6">
      <ReunionPicker reunions={reunions} value={rid} onChange={setRid} />
      <FormCard title={editId ? 'Edit Link' : 'Add Link'} onCancel={editId ? cancelEdit : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Title*" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={field} />
          <input placeholder="URL*" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className={field} />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={`${field} sm:col-span-2`} rows={2} />
        </div>
        <SaveBtn onClick={save} loading={saving} disabled={!form.title || !form.url || !rid} label={editId ? 'Update' : 'Save'} />
      </FormCard>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nothing here yet.</p>
      ) : (
        <div className="rounded-xl bg-white shadow-sm border border-reunion-100 overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-xs text-gray-400">Drag to reorder</p>
          {orderedRows.map(row => (
            <div
              key={row.id}
              draggable
              onDragStart={() => setDragId(row.id)}
              onDragOver={e => { e.preventDefault(); setDragOverId(row.id) }}
              onDrop={handleDrop}
              onDragEnd={() => { setDragId(null); setDragOverId(null) }}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors select-none cursor-grab active:cursor-grabbing ${
                dragId === row.id ? 'opacity-40' : ''
              } ${dragOverId === row.id && dragId !== row.id ? 'bg-reunion-100' : 'hover:bg-reunion-50'}`}
            >
              <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">{row.title}</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">{row.url}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => startEdit(row)} className="rounded-lg p-1.5 text-gray-400 hover:bg-reunion-50 hover:text-reunion-600 transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => remove(row.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Contacts ────────────────────────────────────────────────────────────────

const CONTACT_BLANK = { name: '', role: '', phone: '', email: '', sort_order: '0' }

function ContactsTab({ token }: { token: string }) {
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [rows, setRows] = useState<Contact[]>([])
  const [rid, setRid] = useState('')
  const [form, setForm] = useState(CONTACT_BLANK)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getReunions().then(data => { setReunions(data); if (data[0]) setRid(data[0].id) })
  }, [])

  const load = (id: string) => {
    const year = reunions.find(r => r.id === id)?.year.toString() ?? ''
    if (year) getContacts(year).then(setRows)
  }
  useEffect(() => { if (rid) load(rid) }, [rid])

  const startEdit = (c: Contact) => {
    setEditId(c.id)
    setForm({ name: c.name ?? '', role: c.role ?? '', phone: c.phone ?? '', email: c.email ?? '', sort_order: String(c.sort_order ?? 0) })
  }

  const cancelEdit = () => { setEditId(null); setForm(CONTACT_BLANK) }

  const save = async () => {
    setSaving(true)
    try {
      const body = { ...form, sort_order: Number(form.sort_order) || 0 }
      if (editId) {
        await updateContact(editId, body, token)
        cancelEdit()
      } else {
        await createContact(rid, body, token)
        setForm(CONTACT_BLANK)
      }
      load(rid)
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => { await deleteContact(id, token); load(rid) }

  return (
    <div className="space-y-6">
      <ReunionPicker reunions={reunions} value={rid} onChange={setRid} />
      <FormCard title={editId ? 'Edit Contact' : 'Add Contact'} onCancel={editId ? cancelEdit : undefined}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Name*" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={field} />
          <input placeholder="Role* (e.g. Event Coordinator)" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={field} />
          <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={field} />
          <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={field} />
          <input type="number" placeholder="Sort order" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className={field} />
        </div>
        <SaveBtn onClick={save} loading={saving} disabled={!form.name || !form.role || !rid} label={editId ? 'Update' : 'Save'} />
      </FormCard>
      <Table<Contact> rows={rows} onDelete={remove} onEdit={startEdit} columns={['name', 'role', 'phone', 'email']} />
    </div>
  )
}

// ─── Media ────────────────────────────────────────────────────────────────────

// Admin grid: 2 cols mobile → 3 sm → 4 lg
function adminPageSize() {
  const cols = window.innerWidth >= 1024 ? 4 : window.innerWidth >= 640 ? 3 : 2
  const itemH = window.innerWidth / cols
  return Math.ceil((window.innerHeight * 1.5) / itemH) * cols
}

function MediaTab({ token }: { token: string }) {
  const [reunions, setReunions] = useState<Reunion[]>([])
  const [items, setItems] = useState<Media[]>([])
  const [rid, setRid] = useState('')
  const [deleting, setDeleting] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [visible, setVisible] = useState(() => adminPageSize())
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getReunions().then(data => { setReunions(data); if (data[0]) setRid(data[0].id) })
  }, [])

  const load = (id: string) => {
    const year = reunions.find(r => r.id === id)?.year.toString() ?? ''
    if (year) getPhotos(year).then(data => { setItems(data); setVisible(adminPageSize()) })
  }
  useEffect(() => { if (rid) load(rid) }, [rid])

  // Reveal the next batch when the sentinel scrolls near the viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(v => Math.min(v + adminPageSize(), items.length)) },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [items.length])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(items.map(i => i.id)))
  const clearSelection = () => setSelected(new Set())

  const removeSingle = async (id: string) => {
    setDeleting(prev => new Set(prev).add(id))
    try {
      await deleteMedia(id, token)
      setItems(prev => prev.filter(i => i.id !== id))
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
    } finally {
      setDeleting(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  const removeSelected = async () => {
    if (!confirm(`Delete ${selected.size} item${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    await Promise.all(Array.from(selected).map(id => removeSingle(id)))
  }

  return (
    <div className="space-y-4">
      <ReunionPicker reunions={reunions} value={rid} onChange={setRid} />

      {items.length > 0 && (
        <div className="flex items-center gap-3 min-h-[32px]">
          {selected.size > 0 ? (
            <>
              <span className="text-sm text-gray-600">{selected.size} selected</span>
              <button onClick={selectAll} className="text-sm text-reunion-600 hover:underline">Select all</button>
              <button onClick={clearSelection} className="text-sm text-gray-400 hover:underline">Clear</button>
              <button
                onClick={removeSelected}
                className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selected.size}
              </button>
            </>
          ) : (
            <button onClick={selectAll} className="text-sm text-reunion-600 hover:underline">Select all</button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No media uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, visible).map(item => {
            const isSelected = selected.has(item.id)
            const isDeleting = deleting.has(item.id)
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-white shadow-sm ${
                  isSelected ? 'border-reunion-500 ring-2 ring-reunion-300' : 'border-reunion-100 hover:border-reunion-300'
                }`}
              >
                {/* Selection checkbox */}
                <div className={`absolute top-1.5 left-1.5 z-10 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-reunion-500 border-reunion-500'
                    : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
                }`}>
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {item.type === 'video' ? (
                  <div className="relative aspect-video bg-gray-900">
                    {(item.preview_url ?? item.thumb_url) && (
                      <img src={item.preview_url ?? item.thumb_url!} alt={item.caption ?? 'Video'} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <PlayCircle className="h-8 w-8 text-white drop-shadow" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-100">
                    <img src={item.preview_url ?? item.thumb_url ?? item.url} alt={item.caption ?? ''} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}

                {item.caption && (
                  <p className="px-2 py-1 text-xs text-gray-500 truncate">{item.caption}</p>
                )}

                {/* Single-item delete button */}
                <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); removeSingle(item.id) }}
                    disabled={isDeleting}
                    className="rounded-full bg-black/60 p-1.5 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDeleting
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Deleting overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <div ref={sentinelRef} />
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const field = 'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reunion-400 w-full'

function FormCard({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel?: () => void }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-reunion-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">{title}</h2>
        {onCancel && (
          <button onClick={onCancel} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-3.5 w-3.5" /> Cancel edit
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function SaveBtn({ onClick, loading, disabled, label = 'Save' }: { onClick: () => void; loading: boolean; disabled: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mt-4 flex items-center gap-2 rounded-lg bg-reunion-600 px-4 py-2 text-sm font-semibold text-white hover:bg-reunion-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  )
}

function ReunionPicker({ reunions, value, onChange }: { reunions: Reunion[]; value: string; onChange: (id: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={field}>
      {reunions.map(r => <option key={r.id} value={r.id}>{r.year} — {r.title}</option>)}
    </select>
  )
}

function Table<T extends { id: string }>({
  rows, onDelete, onEdit, columns,
}: {
  rows: T[]
  onDelete: (id: string) => void
  onEdit: (row: T) => void
  columns: (keyof T)[]
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-400 text-center py-6">Nothing here yet.</p>

  return (
    <div className="rounded-xl bg-white shadow-sm border border-reunion-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map(c => (
              <th key={String(c)} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-400 tracking-wider capitalize">
                {String(c).replace(/_/g, ' ')}
              </th>
            ))}
            <th className="px-4 py-3 w-20" />
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-reunion-50 transition-colors">
              {columns.map(c => (
                <td key={String(c)} className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                  {String(row[c] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(row)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-reunion-50 hover:text-reunion-600 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(row.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

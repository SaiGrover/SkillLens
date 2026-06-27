import { FormEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, MessageSquare, Send, Sparkles, Trash2 } from 'lucide-react'

type FeedbackEntry = {
  id: string
  name: string
  role: string
  rating: number
  category: string
  message: string
  createdAt: string
}

const STORAGE_KEY = 'skilllens-feedback'
const categories = ['Overall UI', 'Skill Explorer', 'Forecasts', 'Career Advisor', 'Data Quality', 'Reports']

function readFeedback(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as FeedbackEntry[] : []
  } catch {
    return []
  }
}

export default function Feedback() {
  const [entries, setEntries] = useState<FeedbackEntry[]>(readFeedback)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(8)
  const [category, setCategory] = useState(categories[0])
  const [message, setMessage] = useState('')

  const averageRating = useMemo(() => {
    if (!entries.length) return '0.0'
    return (entries.reduce((sum, item) => sum + item.rating, 0) / entries.length).toFixed(1)
  }, [entries])

  const persist = (next: FeedbackEntry[]) => {
    setEntries(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = message.trim()
    if (!text) return

    const entry: FeedbackEntry = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      name: name.trim() || 'Anonymous reviewer',
      role: role.trim() || 'Project reviewer',
      rating,
      category,
      message: text,
      createdAt: new Date().toISOString(),
    }

    persist([entry, ...entries])
    setMessage('')
  }

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'skilllens-feedback.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">Feedback loop</p>
          <h1 className="page-title flex items-center gap-3">
            <MessageSquare size={28} className="text-fuchsia-200" strokeWidth={1.8} />
            Product Feedback
          </h1>
          <p className="page-subtitle max-w-3xl">
            Collect review notes, ratings, and improvement requests while testing SkillLens. Entries are saved locally in this browser and can be exported.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="feedback-stat">
            <span>Responses</span>
            <b>{entries.length}</b>
          </div>
          <div className="feedback-stat feedback-stat--warm">
            <span>Avg rating</span>
            <b>{averageRating}/10</b>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(360px,0.52fr)]">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="feedback-panel glass rounded-2xl border border-white/10 p-5"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Add feedback</h2>
              <p className="mt-1 text-sm text-white/55">Use this during demos, mentorship reviews, or final portfolio QA.</p>
            </div>
            <Sparkles size={21} className="text-lime-200" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="feedback-field">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" />
            </label>
            <label className="feedback-field">
              <span>Role</span>
              <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Mentor, recruiter, peer..." />
            </label>
            <label className="feedback-field">
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="feedback-field">
              <span>Rating: {rating}/10</span>
              <input type="range" min="1" max="10" value={rating} onChange={(event) => setRating(Number(event.target.value))} />
            </label>
          </div>

          <label className="feedback-field mt-4">
            <span>Feedback</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What felt strong? What was confusing? What should be fixed before submission?"
              rows={8}
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="feedback-primary-button">
              <Send size={16} /> Save feedback
            </button>
            <button type="button" onClick={downloadJson} disabled={!entries.length} className="feedback-secondary-button">
              <Download size={16} /> Export JSON
            </button>
            <button type="button" onClick={() => persist([])} disabled={!entries.length} className="feedback-secondary-button feedback-secondary-button--danger">
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </motion.form>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="feedback-panel glass rounded-2xl border border-white/10 p-5"
        >
          <div className="mb-4">
            <h2 className="section-title">Recent notes</h2>
            <p className="mt-1 text-sm text-white/55">Local browser storage. Export before clearing browser data.</p>
          </div>

          <div className="space-y-3">
            {entries.length ? entries.slice(0, 6).map((entry) => (
              <article key={entry.id} className="feedback-note">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{entry.name}</h3>
                    <p>{entry.role} - {entry.category}</p>
                  </div>
                  <span>{entry.rating}/10</span>
                </div>
                <p className="mt-3">{entry.message}</p>
                <small>{new Date(entry.createdAt).toLocaleString()}</small>
              </article>
            )) : (
              <div className="feedback-empty">
                <MessageSquare size={24} />
                <p>No feedback yet. Add the first review note from the form.</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  )
}

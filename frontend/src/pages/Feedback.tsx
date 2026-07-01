import { FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, MessageSquare, Send, Sparkles, X } from 'lucide-react'
import { feedbackApi } from '@/services/api'

const categories = ['Bug report', 'Feature request', 'Data issue', 'UI feedback', 'Career Advisor', 'General']

export default function Feedback() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(8)
  const [category, setCategory] = useState(categories[0])
  const [message, setMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const text = message.trim()
    if (!text) return
    setSubmitStatus('Sending feedback...')

    try {
      await feedbackApi.submit({
        name: name.trim() || undefined,
        role: role.trim() || undefined,
        rating,
        category,
        message: text,
      })
      setMessage('')
      setSubmitStatus('Thanks. Your feedback was sent to the SkillLens review log.')
    } catch (error) {
      console.warn('Feedback submit failed:', error)
      setSubmitStatus('Could not send feedback. Please make sure the backend API is running.')
    }
  }

  const exportCsv = async () => {
    if (!password.trim()) return
    setExporting(true)
    setExportStatus(null)
    try {
      const csv = await feedbackApi.exportCsv(password)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'skilllens-feedback.csv'
      link.click()
      URL.revokeObjectURL(url)
      setExportStatus('CSV exported.')
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : 'CSV export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <header className="max-w-3xl">
        <p className="section-label">Feedback</p>
        <h1 className="page-title flex items-center gap-3">
          <MessageSquare size={28} className="text-fuchsia-200" strokeWidth={1.8} />
          Help Improve SkillLens
        </h1>
        <p className="page-subtitle">
          Share what worked, what felt confusing, or what should be improved before SkillLens is presented. Your note goes into the private project feedback log.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.96fr)_minmax(300px,0.42fr)]">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="feedback-panel glass rounded-2xl border border-white/10 p-5"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Send app feedback</h2>
              <p className="mt-1 text-sm text-white/55">Report a bug, suggest a feature, or leave a review note.</p>
            </div>
            <button
              type="button"
              aria-label="Owner CSV export"
              title="Owner CSV export"
              className="feedback-owner-trigger"
              onClick={() => {
                setExportOpen(true)
                setExportStatus(null)
              }}
            >
              <Sparkles size={21} />
            </button>
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
              placeholder="Tell us what to fix, improve, or keep."
              rows={8}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="feedback-primary-button">
              <Send size={16} /> Send feedback
            </button>
            {submitStatus && <span className="text-sm text-white/58">{submitStatus}</span>}
          </div>
        </motion.form>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="feedback-panel glass rounded-2xl border border-white/10 p-5"
        >
          <h2 className="section-title">What to share</h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-white/62">
            <p>Point out broken layouts, unclear metrics, suspicious data values, missing explanations, or anything that makes the product harder to trust.</p>
            <p>For data issues, mention the page, skill, and value you saw so it can be traced back to the processed CSV snapshot.</p>
            <p>No feedback is shown publicly on this page.</p>
          </div>

          {exportOpen && (
            <div className="feedback-export-box mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <b>Owner CSV export</b>
                <button type="button" onClick={() => setExportOpen(false)} aria-label="Close export panel">
                  <X size={15} />
                </button>
              </div>
              <label className="feedback-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && exportCsv()}
                  placeholder="FEEDBACK_REVIEW_PASSWORD"
                />
              </label>
              <button type="button" className="feedback-primary-button mt-3 w-full" onClick={exportCsv} disabled={exporting || !password.trim()}>
                <Download size={15} /> {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              {exportStatus && <p className="mt-3 text-xs text-white/58">{exportStatus}</p>}
            </div>
          )}
        </motion.aside>
      </div>
    </div>
  )
}

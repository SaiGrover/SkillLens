import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bot, CheckCircle, Clock, Download, FileText, Map, Save, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkillSummary, skillsApi } from '@/services/api'

const careerGoals = ['AI/ML Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps/SRE', 'Cybersecurity Analyst', 'Cloud Architect']
const currentSkillOptions = ['Python', 'JavaScript', 'SQL', 'Java', 'No coding experience', 'Some college CS']
const timelines = ['3 Months', '6 Months', '12 Months']
const experienceLevels = ['Beginner', 'Intermediate', 'Advanced']
const learningStyles = ['Project-based', 'Visual', 'Reading', 'Mentor-led']
const industries = ['AI & Machine Learning', 'Data Analytics', 'Software Engineering', 'Cloud & DevOps', 'Cybersecurity']

const projects = ['EDA dashboard', 'ML classification model', 'Forecasting project', 'Portfolio case study']

const goalCategoryHints: Record<string, string[]> = {
  'AI/ML Engineer': ['ai_ml', 'programming', 'data_science', 'data_engineering'],
  'Full Stack Developer': ['programming', 'software_engineering', 'database', 'cloud', 'devops'],
  'Data Scientist': ['data_science', 'data_analytics', 'ai_ml', 'programming', 'database'],
  'DevOps/SRE': ['devops', 'cloud', 'engineering_systems', 'tools_platforms', 'programming'],
  'Cybersecurity Analyst': ['cybersecurity', 'cloud', 'programming', 'engineering_systems'],
  'Cloud Architect': ['cloud', 'devops', 'engineering_systems', 'database', 'programming'],
}

function normalized(value?: string) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function stageTitlesFor(timeline: string) {
  if (timeline.startsWith('3')) return ['Weeks 1-3: Foundation', 'Weeks 4-8: Applied Skills', 'Weeks 9-12: Portfolio Proof']
  if (timeline.startsWith('12')) return ['Quarter 1: Foundation', 'Quarter 2: Applied Skills', 'Quarters 3-4: Portfolio Proof']
  return ['Months 1-2: Foundation', 'Months 3-4: Applied Skills', 'Months 5-6: Portfolio Proof']
}

function buildDatasetRoadmap(goal: string, skillRows: SkillSummary[], currentSkills: string) {
  const hints = goalCategoryHints[goal] ?? goalCategoryHints['Full Stack Developer']
  const selected = skillRows
    .filter((skill) => hints.includes(normalized(skill.category)))
    .sort((left, right) => ((right.ses_score ?? 0) + (right.growth_rate ?? 0) * 0.25) - ((left.ses_score ?? 0) + (left.growth_rate ?? 0) * 0.25))
  const unique = Array.from(new globalThis.Map<string, SkillSummary>(selected.map((skill) => [skill.id, skill])).values())
  const current = currentSkills.split(',').map((item) => item.trim()).filter(Boolean)
  const names = [...current, ...unique.map((skill) => skill.name)].filter((value, index, all) => all.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
  const padded = names.length ? names : ['Skill data is loading']
  return [padded.slice(0, 4), padded.slice(4, 8), padded.slice(8, 12)].map((stage, index) => stage.length ? stage : padded.slice(index, index + 1))
}

export default function Roadmaps() {
  const navigate = useNavigate()
  const [goal, setGoal] = useState('Data Scientist')
  const [skills, setSkills] = useState('SQL')
  const [timeline, setTimeline] = useState('6 Months')
  const [level, setLevel] = useState('Beginner')
  const [hours, setHours] = useState('8')
  const [style, setStyle] = useState('Project-based')
  const [industry, setIndustry] = useState('Data Analytics')
  const [role, setRole] = useState('Student')
  const [availableSkills, setAvailableSkills] = useState<SkillSummary[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('skilllens:roadmap-progress') ?? '[]')
      return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string') : []
    } catch {
      return []
    }
  })
  const [generated, setGenerated] = useState(true)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const roadmap = useMemo(() => buildDatasetRoadmap(goal, availableSkills, skills), [goal, availableSkills, skills])
  const stageTitles = useMemo(() => stageTitlesFor(timeline), [timeline])
  const weeklyHours = Math.max(1, Number(hours) || 8)
  const totalHours = useMemo(() => {
    const months = timeline.startsWith('3') ? 3 : timeline.startsWith('12') ? 12 : 6
    return months * 4 * weeklyHours
  }, [timeline, weeklyHours])

  const snapshot = useMemo(() => ({
    createdAt: new Date().toISOString(),
    goal,
    currentSkills: skills,
    timeline,
    level,
    weeklyHours,
    learningStyle: style,
    targetIndustry: industry,
    currentRole: role,
    totalHours,
    stages: roadmap.map((stage, index) => ({ title: stageTitles[index], skills: stage, project: projects[index] ?? projects[0] })),
  }), [goal, skills, timeline, level, weeklyHours, style, industry, role, totalHours, roadmap])

  useEffect(() => {
    const addedSkill = window.localStorage.getItem('skilllens:roadmap-skill')
    if (!addedSkill) return
    setSkills(addedSkill)
    setNotice(`${addedSkill} was added from Skill Explorer.`)
    window.localStorage.removeItem('skilllens:roadmap-skill')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('skilllens:roadmap-progress', JSON.stringify(completedSteps))
  }, [completedSteps])

  const toggleStep = (stepId: string) => {
    setCompletedSteps((current) => current.includes(stepId) ? current.filter((item) => item !== stepId) : [...current, stepId])
  }

  const completedCount = roadmap.flatMap((stage, stageIndex) => stage.map((skill) => `${goal}:${stageIndex}:${skill}`)).filter((id) => completedSteps.includes(id)).length
  const totalStepCount = roadmap.reduce((total, stage) => total + stage.length, 0)

  useEffect(() => {
    let cancelled = false
    skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
      .then((response) => { if (!cancelled) setAvailableSkills(response.items ?? []) })
      .catch(() => { if (!cancelled) setNotice('Skill data could not load; try generating again shortly.') })
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [])

  const generate = async () => {
    setLoading(true)
    if (!availableSkills.length) {
      try {
        const response = await skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
        setAvailableSkills(response.items ?? [])
      } catch {
        setNotice('The skill dataset is unavailable. Roadmap generation needs the processed snapshot.')
      }
    }
    setLoading(false)
    setGenerated(true)
    setNotice('Roadmap updated from the highest-ranked matching skills in the processed dataset.')
  }

  const downloadRoadmap = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${goal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-roadmap.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Roadmap JSON downloaded.')
  }

  const saveRoadmap = () => {
    const previous = JSON.parse(window.localStorage.getItem('skilllens:saved-roadmaps') ?? '[]')
    const items = Array.isArray(previous) ? previous : []
    window.localStorage.setItem('skilllens:saved-roadmaps', JSON.stringify([snapshot, ...items].slice(0, 10)))
    setNotice('Roadmap saved in this browser.')
  }

  const askAdvisor = () => {
    window.localStorage.setItem('skilllens:advisor-prompt', `Review my ${timeline} roadmap from ${role || 'my current role'} to ${goal}. My starting skill is ${skills}.`)
    navigate('/advisor')
  }

  const exportPdf = () => {
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
    const stages = snapshot.stages.map((stage) => `
      <section><h2>${escapeHtml(stage.title)}</h2><p><b>Skills:</b> ${stage.skills.map(escapeHtml).join(', ')}</p><p><b>Mini project:</b> ${escapeHtml(stage.project)}</p></section>`).join('')
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      setNotice('Allow pop-ups to export the roadmap as a PDF.')
      return
    }
    printWindow.document.write(`<!doctype html><html><head><title>${escapeHtml(goal)} Roadmap</title><style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;margin:40px;line-height:1.55}h1{font-size:28px;margin-bottom:4px}h2{font-size:18px;margin-top:28px;border-bottom:1px solid #cbd5e1;padding-bottom:7px}.meta{color:#475569;margin-bottom:22px}.badge{display:inline-block;background:#ecfeff;border:1px solid #a5f3fc;padding:5px 9px;border-radius:999px;margin:0 6px 10px 0}section{break-inside:avoid;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0}@media print{body{margin:24px}}</style></head><body><h1>${escapeHtml(goal)} Learning Roadmap</h1><p class="meta">${escapeHtml(role || 'Learner')} - ${escapeHtml(timeline)} - ${weeklyHours} hours/week - ${totalHours} estimated hours</p><span class="badge">${escapeHtml(industry)}</span><span class="badge">${escapeHtml(level)}</span><span class="badge">${escapeHtml(style)}</span>${stages}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setNotice('The print dialog is open - choose Save as PDF to export.')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <Map size={26} className="text-fuchsia-300" strokeWidth={1.75} /> Learning Roadmap Generator
        </h1>
        <p className="page-subtitle">Personalized career paths using your target role, available time, current skills, and target industry.</p>
        {notice && <p className="mt-2 text-xs text-fuchsia-200">{notice}</p>}
      </div>

      <section className="glass rounded-xl border border-white/5 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Career Goal"><ChoiceList value={goal} options={careerGoals} onChange={(value) => { setGoal(value); setGenerated(false) }} /></Field>
          <Field label="Current Skills"><ChoiceList value={skills} options={currentSkillOptions} onChange={setSkills} /></Field>
          <Field label="Timeline"><Segmented value={timeline} options={timelines} onChange={setTimeline} /></Field>
          <Field label="Experience Level"><Segmented value={level} options={experienceLevels} onChange={setLevel} /></Field>
          <Field label="Weekly Study Hours">
            <input value={hours} onChange={(event) => setHours(event.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-400/40" />
          </Field>
          <Field label="Preferred Learning Style"><Segmented value={style} options={learningStyles} onChange={setStyle} /></Field>
          <Field label="Target Industry"><ChoiceList value={industry} options={industries} onChange={setIndustry} /></Field>
          <Field label="Current Role">
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Student, analyst..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-fuchsia-400/40" />
          </Field>
          <div className="xl:col-span-2 flex items-end">
            <button onClick={generate} disabled={loading || dataLoading} className="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 text-sm font-semibold text-white transition-all hover:from-fuchsia-500 hover:to-violet-500 disabled:opacity-50">
              {loading || dataLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Bot size={16} />}
              {dataLoading ? 'Loading skill data...' : 'Generate Roadmap'}
            </button>
          </div>
        </div>
      </section>

      {generated && (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass rounded-xl border border-white/5 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{role || 'Learner'} to {goal}</h2>
                <p className="mt-1 text-sm text-white/45">{timeline} plan - {weeklyHours} hrs/week - {totalHours} total estimated hours - {industry}</p>
              </div>
              <div className="flex items-center gap-2"><span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">{style}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">{completedCount}/{totalStepCount} complete</span></div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {roadmap.map((skillsForStage, index) => (
              <StageCard key={stageTitles[index]} title={stageTitles[index]} index={index} skills={skillsForStage} hours={Math.round(totalHours / 3)} project={projects[index] ?? projects[0]} completedSteps={completedSteps} stepPrefix={`${goal}:${index}:`} onToggleStep={toggleStep} />
            ))}
          </div>

          <section className="glass rounded-xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-white/85">Project milestones</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {projects.map((project, index) => (
                <div key={project} className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-xs text-fuchsia-300">Project {index + 1}</p>
                  <b className="mt-1 block text-sm text-white">{project}</b>
                  <span className="mt-2 block text-xs text-white/38">Portfolio proof for {goal}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button onClick={downloadRoadmap} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition-colors hover:border-fuchsia-400/35 hover:text-white"><Download size={15} /> Download Roadmap</button>
            <button onClick={saveRoadmap} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition-colors hover:border-fuchsia-400/35 hover:text-white"><Save size={15} /> Save Roadmap</button>
            <button onClick={askAdvisor} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition-colors hover:border-fuchsia-400/35 hover:text-white"><Send size={15} /> Ask AI Advisor</button>
            <button onClick={exportPdf} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition-colors hover:border-fuchsia-400/35 hover:text-white"><FileText size={15} /> Export as PDF</button>
          </div>
        </motion.section>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wider text-white/45">{label}</span>
      {children}
    </label>
  )
}

function ChoiceList({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="max-h-[122px] overflow-y-auto rounded-lg border border-white/10 bg-white/[0.035] p-1">
      {options.map((option) => (
        <button key={option} onClick={() => onChange(option)} className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${value === option ? 'bg-fuchsia-400/15 text-fuchsia-200' : 'text-white/55 hover:bg-white/5 hover:text-white/80'}`}>
          {option}
        </button>
      ))}
    </div>
  )
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-1">
      {options.map((option) => (
        <button key={option} onClick={() => onChange(option)} className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${value === option ? 'bg-violet-500/20 text-violet-100' : 'text-white/50 hover:bg-white/5 hover:text-white/80'}`}>
          {option}
        </button>
      ))}
    </div>
  )
}

function StageCard({ title, index, skills, hours, project, completedSteps, stepPrefix, onToggleStep }: { title: string; index: number; skills: string[]; hours: number; project: string; completedSteps: string[]; stepPrefix: string; onToggleStep: (stepId: string) => void }) {
  const tones = ['text-emerald-300', 'text-amber-300', 'text-violet-300']
  return (
    <div className="glass rounded-xl border border-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${tones[index]}`}>{title}</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{['Foundation', 'Applied Skills', 'Portfolio Proof'][index]}</h3>
        </div>
        <Clock size={18} className="text-white/35" />
      </div>
      <div className="mt-4 space-y-2">
        {skills.map((skill, itemIndex) => (
          <button key={skill} type="button" onClick={() => onToggleStep(`${stepPrefix}${skill}`)} className="flex w-full items-center gap-2 text-left text-sm text-white/65 transition-colors hover:text-white">
            <CheckCircle size={14} className={completedSteps.includes(`${stepPrefix}${skill}`) ? 'text-emerald-300' : 'text-white/22'} />
            <span className={completedSteps.includes(`${stepPrefix}${skill}`) ? 'line-through text-white/35' : ''}>{skill}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-white/8 bg-white/[0.035] p-3">
        <p className="text-xs text-white/35">Mini project</p>
        <b className="mt-1 block text-sm text-white">{project}</b>
        <p className="mt-2 text-xs text-white/38">Expected outcome: a demonstrable artifact for interviews.</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-xs text-white/38">
        <span>{hours} hours</span>
        <span>{['Beginner', 'Intermediate', 'Advanced'][index]}</span>
      </div>
    </div>
  )
}

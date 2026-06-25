import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, CheckCircle2, Compass, Search, Sparkles, Target, Wand2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { SkillSummary, skillsApi } from '@/services/api'
import { formatCategoryLabel } from '@/lib/skillGuideContent'

type RolePreset = {
  role: string
  categories: string[]
  anchors: string[]
  requirement: string
}

const rolePresets: RolePreset[] = [
  {
    role: 'Data Analyst',
    categories: ['Data Analytics', 'Database', 'Programming'],
    anchors: ['sql', 'excel', 'python', 'power-bi', 'tableau', 'data-visualization'],
    requirement: 'dashboards, reporting, SQL analysis, spreadsheet modeling, and stakeholder insights',
  },
  {
    role: 'Data Scientist',
    categories: ['AI_ML', 'Data Analytics', 'Programming', 'Database'],
    anchors: ['python', 'statistics', 'machine-learning', 'pytorch', 'tensorflow', 'sql'],
    requirement: 'modeling, experimentation, Python analysis, feature engineering, and ML workflows',
  },
  {
    role: 'Frontend Developer',
    categories: ['Programming', 'Software Engineering', 'Tools_Platforms'],
    anchors: ['javascript', 'typescript', 'react', 'git', 'github', 'testing'],
    requirement: 'interactive interfaces, component systems, browser performance, and product delivery',
  },
  {
    role: 'Cloud Engineer',
    categories: ['Cloud', 'DevOps', 'Cybersecurity'],
    anchors: ['aws', 'azure', 'docker', 'kubernetes', 'linux', 'cloud-security'],
    requirement: 'cloud deployment, container operations, automation, reliability, and infrastructure security',
  },
  {
    role: 'Cybersecurity Analyst',
    categories: ['Cybersecurity', 'Cloud', 'Software Engineering'],
    anchors: ['cyber-security', 'penetration-testing', 'cloud-security', 'linux', 'network-security', 'python'],
    requirement: 'threat analysis, secure systems, testing, cloud posture, and incident response',
  },
  {
    role: 'AI Engineer',
    categories: ['AI_ML', 'Programming', 'Data Engineering'],
    anchors: ['python', 'machine-learning', 'deep-learning', 'pytorch', 'tensorflow', 'natural-language-processing'],
    requirement: 'model building, AI application development, data pipelines, and production inference',
  },
]

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function norm(value?: string) {
  return (value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function categoryNorm(value?: string) {
  return (value ?? '').toLowerCase().replace(/[\s/-]+/g, '_')
}

function demand(skill: SkillSummary) {
  return pct(skill.linkedin_demand)
}

function salary(skill: SkillSummary) {
  return pct(skill.salary_premium)
}

function roleFitScore(skill: SkillSummary, preset: RolePreset, requirement: string) {
  const skillId = norm(skill.id || skill.name)
  const text = `${requirement} ${preset.requirement} ${preset.role}`.toLowerCase()
  const categoryFit = preset.categories.some((category) => categoryNorm(category) === categoryNorm(skill.category)) ? 28 : 0
  const anchorFit = preset.anchors.some((anchor) => skillId.includes(norm(anchor)) || norm(anchor).includes(skillId)) ? 34 : 0
  const nameFit = text.includes(skill.name.toLowerCase()) ? 18 : 0
  const signal = pct(skill.ses_score) * 0.22 + demand(skill) * 0.12 + salary(skill) * 0.08 + pct(skill.growth_rate) * 0.08
  return Math.round(categoryFit + anchorFit + nameFit + signal)
}

function reasonFor(skill: SkillSummary, preset: RolePreset, requirement: string) {
  const parts = []
  if (preset.anchors.some((anchor) => norm(skill.id || skill.name).includes(norm(anchor)) || norm(anchor).includes(norm(skill.id || skill.name)))) {
    parts.push(`core ${preset.role.toLowerCase()} tool`)
  }
  if (preset.categories.some((category) => categoryNorm(category) === categoryNorm(skill.category))) {
    parts.push(`fits the ${formatCategoryLabel(skill.category)} requirement`)
  }
  if (demand(skill) >= 50) parts.push(`strong demand signal (${demand(skill)}/100)`)
  if (salary(skill) >= 50) parts.push(`solid salary value (${salary(skill)}/100)`)
  if ((skill.forecast_trend ?? '').toLowerCase().includes('grow')) parts.push('positive forecast trend')
  if (!parts.length && requirement.trim()) parts.push('closest dataset match for this requirement')
  return parts.join(', ')
}

export default function Recommender() {
  const [searchParams] = useSearchParams()
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [role, setRole] = useState('Data Analyst')
  const [requirement, setRequirement] = useState('Build dashboards, analyze business data, and explain trends to stakeholders')
  const [currentSkills, setCurrentSkills] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const presetSkill = searchParams.get('skill')
    const storedSkill = window.localStorage.getItem('skilllens:recommender-skill')
    if (storedSkill) {
      setCurrentSkills(storedSkill)
      window.localStorage.removeItem('skilllens:recommender-skill')
    } else if (presetSkill) {
      setCurrentSkills(presetSkill)
    }
  }, [searchParams])

  useEffect(() => {
    skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
      .then((result) => setSkills(result.items ?? []))
      .finally(() => setLoading(false))
  }, [])

  const preset = rolePresets.find((item) => item.role === role) ?? rolePresets[0]
  const currentSet = new Set(currentSkills.split(',').map((item) => norm(item)).filter(Boolean))

  const recommendations = useMemo(() => {
    return skills
      .filter((skill) => !currentSet.has(norm(skill.id)) && !currentSet.has(norm(skill.name)))
      .map((skill) => ({
        skill,
        fit: roleFitScore(skill, preset, requirement),
        reason: reasonFor(skill, preset, requirement),
      }))
      .sort((a, b) => b.fit - a.fit)
      .slice(0, 8)
  }, [skills, currentSet, preset, requirement])

  const best = recommendations[0]

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center text-sm text-white/50">Loading dataset-backed recommendations...</div>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      <header className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
        <div>
          <span className="inline-flex rounded-full border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
            Goal-based skill matching
          </span>
          <h1 className="page-title mt-3 flex items-center gap-3">
            <Target size={30} className="text-fuchsia-200" />
            Skill Recommender
          </h1>
          <p className="page-subtitle max-w-3xl">
            Choose a role or requirement and SkillLens ranks the skills/tools that fit that purpose best.
            Recommendations use the current HSEP dataset instead of one generic learning path for everyone.
          </p>
        </div>
        <div className="glass rounded-2xl border border-white/8 p-4">
          <p className="section-label">Best current match</p>
          {best ? (
            <div className="mt-3 flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500/70 via-rose-400/60 to-amber-300/70 text-lg font-black text-white">
                {best.skill.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <b className="text-lg text-white">{best.skill.name}</b>
                <p className="mt-1 text-sm text-white/60">{best.reason}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-1 text-fuchsia-100">Fit {best.fit}</span>
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-amber-100">SES {pct(best.skill.ses_score)}/100</span>
                  <span className="rounded-full border border-rose-300/20 bg-rose-300/10 px-2 py-1 text-rose-100">{best.skill.forecast_trend ?? 'Tracked'}</span>
                </div>
              </div>
            </div>
          ) : <p className="mt-2 text-sm text-white/45">No recommendations found for this selection.</p>}
        </div>
      </header>

      <section className="glass grid gap-4 rounded-2xl border border-white/8 p-4 lg:grid-cols-[220px_1fr_1fr]">
        <label className="space-y-2">
          <span className="section-label">Target role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white outline-none">
            {rolePresets.map((item) => <option key={item.role}>{item.role}</option>)}
          </select>
        </label>
        <label className="space-y-2">
          <span className="section-label">Requirement / goal</span>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input value={requirement} onChange={(event) => setRequirement(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-3 text-sm text-white outline-none" />
          </div>
        </label>
        <label className="space-y-2">
          <span className="section-label">Already know</span>
          <input value={currentSkills} onChange={(event) => setCurrentSkills(event.target.value)} placeholder="SQL, Excel..." className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-3 text-sm text-white outline-none" />
        </label>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map(({ skill, fit, reason }, index) => (
            <article key={skill.id} className="skill-recommender-card glass rounded-2xl border border-white/8 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-fuchsia-200">#{index + 1} recommended for {role}</span>
                  <h2 className="mt-1 text-xl font-bold text-white">{skill.name}</h2>
                  <p className="mt-1 text-sm text-white/52">{formatCategoryLabel(skill.category)}</p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center">
                  <b className="block text-lg text-amber-100">{fit}</b>
                  <span className="text-[10px] uppercase tracking-wider text-amber-100/60">fit</span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/68">
                {skill.name} is useful here because it is a {reason}. It should be learned for this role when the requirement includes {preset.requirement}.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Signal label="SES" value={`${pct(skill.ses_score)}/100`} />
                <Signal label="Demand" value={`${demand(skill)}/100`} />
                <Signal label="Salary" value={`${salary(skill)}/100`} />
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="glass rounded-2xl border border-white/8 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Compass size={16} className="text-fuchsia-200" /> Role fit logic</h3>
            <div className="mt-3 space-y-3 text-sm text-white/58">
              <p><CheckCircle2 size={14} className="mr-2 inline text-fuchsia-200" /> Category match with the selected role.</p>
              <p><CheckCircle2 size={14} className="mr-2 inline text-fuchsia-200" /> Core tools known for that requirement.</p>
              <p><CheckCircle2 size={14} className="mr-2 inline text-fuchsia-200" /> SES, demand, salary value, and growth signals.</p>
            </div>
          </section>
          <section className="glass rounded-2xl border border-white/8 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><BrainCircuit size={16} className="text-amber-200" /> Requirement profile</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/58">{preset.requirement}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {preset.categories.map((item) => <span key={item} className="rounded-full border border-fuchsia-300/18 bg-fuchsia-300/10 px-2 py-1 text-xs text-fuchsia-100">{formatCategoryLabel(item)}</span>)}
            </div>
          </section>
          <section className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-fuchsia-50"><Wand2 size={16} /> How to use this</h3>
            <p className="mt-2 text-sm leading-relaxed text-fuchsia-50/70">Pick the first two or three tools that match your goal, then ask the Career Advisor to compare them for your exact background.</p>
            <a href="/advisor" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-100">Open Career Advisor <ArrowRight size={14} /></a>
          </section>
        </aside>
      </section>
    </div>
  )
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
      <span className="block text-[10px] uppercase tracking-wider text-white/35">{label}</span>
      <b className="mt-1 block text-sm text-white">{value}</b>
    </div>
  )
}

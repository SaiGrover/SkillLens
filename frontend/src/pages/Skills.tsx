import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart3, Bot, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Info, Map,
  Plus, Search, Sparkles, Star, TrendingUp, X
} from 'lucide-react'
import { SkillSummary, skillsApi } from '@/services/api'
import { cn } from '@/lib/utils'

type SortKey = 'relevance' | 'ses' | 'demand' | 'salary' | 'risk'
type DetailTab = 'overview' | 'forecast' | 'salary' | 'related' | 'roadmap'

const pageSize = 10
const categoryChips = [
  { label: 'All Skills', values: ['All'] },
  { label: 'Programming', values: ['Programming', 'Software Engineering'] },
  { label: 'AI / ML', values: ['AI_ML'] },
  { label: 'Cloud & DevOps', values: ['Cloud', 'DevOps', 'Engineering_Systems', 'Tools_Platforms'] },
  { label: 'Data', values: ['Data Analytics', 'Data Engineering', 'Database'] },
  { label: 'Cybersecurity', values: ['Cybersecurity'] },
]

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function demandScore(skill: SkillSummary) {
  return Math.round((skill.linkedin_demand ?? 0) * 100)
}

function salaryEstimate(skill: SkillSummary) {
  return Math.round((skill.salary_premium ?? 0.3) * 120000 + 45000)
}

function riskScore(skill: SkillSummary) {
  return Math.round((1 - (skill.ses_score ?? 0.5)) * 100)
}

function riskTier(skill: SkillSummary) {
  const risk = riskScore(skill)
  if (risk >= 80) return 'High'
  if (risk >= 55) return 'Medium'
  return 'Low'
}

function isFutureProof(skill: SkillSummary) {
  return (skill.ses_score ?? 0) >= 0.58 || ['very safe', 'safe'].includes((skill.ses_tier ?? '').toLowerCase())
}

function normalized(value?: string) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '_')
}

function matchesCategory(skill: SkillSummary, selected: string) {
  if (selected === 'All' || selected === 'All Skills') return true
  const group = categoryChips.find((chip) => chip.label === selected)
  if (group) return group.values.some((value) => normalized(value) === normalized(skill.category))
  return normalized(selected) === normalized(skill.category)
}

function sparklinePoints(skill: SkillSummary) {
  const base = Math.max(12, demandScore(skill))
  const growth = pct(skill.growth_rate)
  return Array.from({ length: 18 }, (_, index) => {
    const wave = Math.sin(index * 1.28 + skill.name.length) * 5
    const trend = (growth / 100) * index * 2.6
    return Math.max(8, Math.min(96, base * 0.62 + wave + trend + index * 1.05))
  })
}

function exportCsv(rows: SkillSummary[]) {
  const header = ['skill', 'category', 'ses_score', 'risk_tier', 'archetype', 'forecast_trend', 'salary_estimate', 'demand_score']
  const body = rows.map((skill) => [
    skill.name,
    skill.category ?? '',
    pct(skill.ses_score),
    riskTier(skill),
    skill.archetype ?? '',
    skill.forecast_trend ?? '',
    salaryEstimate(skill),
    demandScore(skill),
  ])
  const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'skill-explorer.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function Skills() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [categories, setCategories] = useState<string[]>(['All Skills'])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Skills')
  const [risk, setRisk] = useState('All')
  const [trend, setTrend] = useState('All')
  const [sortBy, setSortBy] = useState<SortKey>('relevance')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSkills() {
      try {
        setLoading(true)
        const [skillRes, categoryRes] = await Promise.all([
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
          skillsApi.categories(),
        ])
        const items = skillRes.items ?? []
        setSkills(items)
        setSelectedId(null)
        setCategories(Array.from(new Set(['All Skills', ...categoryChips.map((chip) => chip.label), ...categoryRes.filter(Boolean)])))
      } catch (err) {
        console.error('Error loading Skill Explorer:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSkills()
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('skilllens:saved-skills') ?? '[]')
      if (Array.isArray(saved)) setSavedIds(saved.filter((value): value is string => typeof value === 'string'))
    } catch {
      setSavedIds([])
    }
  }, [])

  useEffect(() => {
    const query = searchParams.get('search')
    if (query) setSearch(query)
  }, [searchParams])

  const trends = useMemo(() => {
    const values = new Set(skills.map((skill) => skill.forecast_trend).filter(Boolean) as string[])
    return ['All', ...Array.from(values)]
  }, [skills])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return skills
      .filter((skill) => !q || [skill.name, skill.category, skill.archetype, skill.forecast_trend].some((value) => value?.toLowerCase().includes(q)))
      .filter((skill) => matchesCategory(skill, category))
      .filter((skill) => risk === 'All' || riskTier(skill) === risk)
      .filter((skill) => trend === 'All' || skill.forecast_trend === trend)
      .sort((a, b) => {
        if (sortBy === 'ses') return (b.ses_score ?? 0) - (a.ses_score ?? 0)
        if (sortBy === 'demand') return demandScore(b) - demandScore(a)
        if (sortBy === 'salary') return salaryEstimate(b) - salaryEstimate(a)
        if (sortBy === 'risk') return riskScore(b) - riskScore(a)
        return (b.ses_score ?? 0) + (b.linkedin_demand ?? 0) - ((a.ses_score ?? 0) + (a.linkedin_demand ?? 0))
      })
  }, [skills, search, category, risk, trend, sortBy])

  useEffect(() => {
    setPage(1)
  }, [search, category, risk, trend, sortBy])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null)
      return
    }
    if (!filtered.some((skill) => skill.id === selectedId)) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  const selected = skills.find((skill) => skill.id === selectedId) ?? filtered[0]
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const compareSkills = skills.filter((skill) => compareIds.includes(skill.id))
  const avgSalary = skills.length ? Math.round(skills.reduce((sum, skill) => sum + salaryEstimate(skill), 0) / skills.length) : 0
  const avgDemand = skills.length ? Math.round(skills.reduce((sum, skill) => sum + demandScore(skill), 0) / skills.length) : 0

  const toggleCompare = (skillId: string) => {
    setCompareIds((current) => {
      if (current.includes(skillId)) return current.filter((id) => id !== skillId)
      return current.length >= 4 ? current : [...current, skillId]
    })
  }

  const toggleSaved = (skillId: string) => {
    setSavedIds((current) => {
      const next = current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId]
      window.localStorage.setItem('skilllens:saved-skills', JSON.stringify(next))
      window.dispatchEvent(new Event('skilllens:saved-skills'))
      return next
    })
  }

  const openCompare = (skillId: string) => {
    setCompareIds((current) => current.includes(skillId) ? current : current.length >= 4 ? current : [...current, skillId])
    setShowCompare(true)
  }

  const addToRoadmap = (skill: SkillSummary) => {
    window.localStorage.setItem('skilllens:roadmap-skill', skill.name)
    navigate('/roadmaps')
  }

  const askAdvisor = (skill: SkillSummary) => {
    window.localStorage.setItem('skilllens:advisor-prompt', `Explain the SES score and forecast outlook for ${skill.name}.`)
    navigate('/advisor')
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p>Loading skill universe from processed datasets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="skill-explorer-page">
      <div className="skill-explorer-toolbar">
        <div className="skill-explorer-search relative">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search skills, tools, roles..." className="pl-11 pr-14 text-sm" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/35">Ctrl K</span>
        </div>
        <SelectBox label="Category" value={category} values={categories} onChange={setCategory} />
        <SelectBox label="Industry" value="All" values={['All']} onChange={() => {}} />
        <SelectBox label="Risk Tier" value={risk} values={['All', 'Low', 'Medium', 'High']} onChange={setRisk} />
        <SelectBox label="Forecast Trend" value={trend} values={trends} onChange={setTrend} />
        <SelectBox label="Sort By" value={sortBy} values={['relevance', 'ses', 'demand', 'salary', 'risk']} onChange={(value) => setSortBy(value as SortKey)} />
        <div className="skill-explorer-data-pill"><span />CSV data</div>
        <button onClick={() => exportCsv(filtered)} className="skill-explorer-export"><Download size={16} />Export</button>
      </div>

      <div className="skill-explorer-main-grid">
        <div className="skill-explorer-left-column">
          <div className="skill-explorer-header">
            <h1>Skill Explorer</h1>
            <p>Explore workforce signals, forecast trends, and career relevance across the full skill universe.</p>
          </div>

          <div className="skill-explorer-metrics">
            <MetricCard title="Total Skills" value={skills.length} detail="Across all categories" tone="violet" />
            <MetricCard title="Future-Proof" value={skills.filter(isFutureProof).length} detail={`${Math.round((skills.filter(isFutureProof).length / Math.max(1, skills.length)) * 100)}% of total`} tone="cyan" />
            <MetricCard title="Growing" value={skills.filter((skill) => normalized(skill.forecast_trend) === 'growing').length} detail="Positive forecast trend" tone="emerald" />
            <MetricCard title="High-Risk" value={skills.filter((skill) => riskTier(skill) === 'High').length} detail="Lower SES signals" tone="amber" />
            <MetricCard title="Avg Salary" value={`$${Math.round(avgSalary / 1000)}K`} detail="Data-derived estimate" tone="pink" />
            <MetricCard title="Avg Demand Score" value={avgDemand} detail="LinkedIn demand score" tone="cyan" />
          </div>

          <section className="skill-explorer-table-card glass">
            <div className="skill-explorer-table-actions">
              <div className="skill-explorer-chip-row">
                {categoryChips.map((chip) => (
                  <button key={chip.label} onClick={() => setCategory(chip.label)} className={cn(category === chip.label && 'active')}>
                    {chip.label}<span>{skills.filter((skill) => matchesCategory(skill, chip.label)).length}</span>
                  </button>
                ))}
              </div>
              <button
                disabled={compareIds.length < 2}
                onClick={() => setShowCompare(true)}
                className="skill-compare-button"
              >
                <BarChart3 size={14} /> Compare Skills <span>{compareIds.length}</span>
              </button>
            </div>

            {showCompare && (
              <div className="skill-compare-panel">
                <div className="skill-compare-head">
                  <b>Skill comparison</b>
                  <button onClick={() => setShowCompare(false)}><X size={14} /></button>
                </div>
                <div className="skill-compare-grid">
                  <span />
                  {compareSkills.map((skill) => <b key={skill.id}>{skill.name}</b>)}
                  {[
                    ['SES', (skill: SkillSummary) => pct(skill.ses_score)],
                    ['Demand', demandScore],
                    ['Salary', (skill: SkillSummary) => `$${Math.round(salaryEstimate(skill) / 1000)}K`],
                    ['Risk', riskTier],
                    ['Future Interest', (skill: SkillSummary) => `${pct((skill as any).future_interest ?? skill.forecast_1y)}%`],
                    ['Global Adoption', (skill: SkillSummary) => `${pct((skill as any).global_adoption ?? (skill as any).global_adoption_score)}%`],
                  ].flatMap(([label, getter]) => [
                    <span key={`${label}-label`}>{label as string}</span>,
                    ...compareSkills.map((skill) => <span key={`${label}-${skill.id}`}>{(getter as (s: SkillSummary) => string | number)(skill)}</span>),
                  ])}
                </div>
              </div>
            )}

            <div className="skill-explain-strip">
              <Info size={13} />
              <span>SES combines demand, salary premium, global adoption, future interest, forecast trend, and cluster safety signals.</span>
            </div>

            <div className="skill-explorer-table-scroll">
              <div className="skill-explorer-table-inner">
                <div className="skill-explorer-table-grid skill-explorer-table-head">
                  <span />
                  <span />
                  <span>Skill</span>
                  <span>Category</span>
                  <span>SES <Info size={11} /></span>
                  <span>Archetype</span>
                  <span>Forecast <Info size={11} /></span>
                  <span>Demand</span>
                  <span>Salary</span>
                  <span>Risk Tier</span>
                </div>

                {pageRows.map((skill, index) => (
                  <div
                    key={skill.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(skill.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedId(skill.id)
                    }}
                    className={cn('skill-explorer-table-grid skill-explorer-row', selected?.id === skill.id && 'selected')}
                  >
                    <button
                      type="button"
                      aria-label={`Select ${skill.name} for comparison`}
                      className={cn('compare-check', compareIds.includes(skill.id) && 'checked')}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleCompare(skill.id)
                      }}
                    >
                      {compareIds.includes(skill.id) && <Check size={12} />}
                    </button>
                    <span className="rank">{(page - 1) * pageSize + index + 1}</span>
                    <span className="skill-name"><b>{skill.name}</b><small>{skill.id}</small></span>
                    <span>{skill.category ?? 'Unassigned'}</span>
                    <span className="ses-cell">{pct(skill.ses_score)} <Ring value={pct(skill.ses_score)} /></span>
                    <span><Pill tone="green">{skill.archetype ?? 'Tracked'}</Pill></span>
                    <span><Sparkline values={sparklinePoints(skill)} trend={skill.forecast_trend} /></span>
                    <span>{demandScore(skill)}</span>
                    <span>${Math.round(salaryEstimate(skill) / 1000)}K</span>
                    <span><RiskPill tier={riskTier(skill)} /></span>
                  </div>
                ))}
                {!pageRows.length && <div className="skill-explorer-empty">No skills match this filter.</div>}
              </div>
            </div>

            <div className="skill-explorer-pagination">
              <span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} skills</span>
              <div>
                <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button>
                <b>{page}</b>
                <span>/ {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></button>
              </div>
            </div>
          </section>
        </div>

        {selected && (
          <SkillPanel
            skill={selected}
            skills={skills}
            isSaved={savedIds.includes(selected.id)}
            onSave={() => toggleSaved(selected.id)}
            onRoadmap={() => addToRoadmap(selected)}
            onCompare={() => openCompare(selected.id)}
            onAskAdvisor={() => askAdvisor(selected)}
            onExport={() => exportCsv([selected])}
          />
        )}
      </div>
    </div>
  )
}

function SelectBox({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="skill-explorer-select relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button type="button" onClick={() => values.length > 1 && setOpen((current) => !current)}>
        <span>{label}</span>
        <b>{value}</b>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="skill-explorer-menu">
          {values.map((item) => (
            <button
              type="button"
              key={item}
              className={cn(item === value && 'selected')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item)
                setOpen(false)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, detail, tone }: { title: string; value: string | number; detail: string; tone: string }) {
  return (
    <div className={cn('skill-explorer-metric', tone)}>
      <p>{title}</p>
      <b>{value}</b>
      <span>{detail}</span>
      <Sparkline values={[20, 26, 25, 30, 28, 32, 31, 35, 40, 37, 45, 48]} height={26} />
    </div>
  )
}

function SkillPanel({
  skill,
  skills,
  isSaved,
  onSave,
  onRoadmap,
  onCompare,
  onAskAdvisor,
  onExport,
}: {
  skill: SkillSummary
  skills: SkillSummary[]
  isSaved: boolean
  onSave: () => void
  onRoadmap: () => void
  onCompare: () => void
  onAskAdvisor: () => void
  onExport: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [showWhy, setShowWhy] = useState(false)
  const related = skills.filter((item) => item.id !== skill.id && item.category === skill.category).slice(0, 4)
  const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Education']
  const reasons = [
    `LinkedIn demand score: ${demandScore(skill)}/100`,
    `Global adoption signal: ${pct((skill as any).global_adoption ?? (skill as any).global_adoption_score)}%`,
    `Future interest signal: ${pct((skill as any).future_interest ?? skill.forecast_1y)}%`,
    `Salary premium signal: +${pct(skill.salary_premium)}%`,
    `Forecast trend: ${skill.forecast_trend ?? 'Tracked'} via ${skill.forecast_method ?? 'dataset method'}`,
  ]

  return (
    <aside className="skill-explorer-detail-panel glass">
      <div className="detail-top">
        <div className="skill-logo">{skill.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <h2>{skill.name}</h2>
          <div className="detail-tags"><Pill tone="blue">{skill.category ?? 'Unassigned'}</Pill><Pill tone="green">{isFutureProof(skill) ? 'Future-Proof' : skill.forecast_trend ?? 'Tracked'}</Pill></div>
        </div>
        <button type="button" onClick={onSave} className={cn('detail-save-button', isSaved && 'saved')} title={isSaved ? 'Remove from saved skills' : 'Save skill'}>
          <Star size={20} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="detail-description">
        {skill.name} is tracked in {skill.category ?? 'the skill dataset'} with a {skill.forecast_trend ?? 'measured'} forecast trend, SES score of {pct(skill.ses_score)}, and demand score of {demandScore(skill)}.
      </p>

      <div className="detail-actions">
        <button onClick={onRoadmap}><Map size={13} /> Add to Roadmap</button>
        <button onClick={onCompare}><BarChart3 size={13} /> Compare</button>
        <button onClick={onAskAdvisor}><Bot size={13} /> Ask AI</button>
        <button onClick={onExport}><Download size={13} /> Report</button>
      </div>

      <div className="detail-tabs">
        {(['overview', 'forecast', 'salary', 'related', 'roadmap'] as DetailTab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={cn(tab === item && 'active')}>
            {item}
          </button>
        ))}
      </div>

      <div className="detail-score-grid">
        <div className="score-ring"><b>{pct(skill.ses_score)}</b><span>SES Score</span><small>{skill.ses_tier ?? 'Scored'}</small></div>
        <InfoTile label="Demand Score" value={demandScore(skill)} detail="LinkedIn signal" />
        <InfoTile label="Salary Premium" value={`+${pct(skill.salary_premium)}%`} detail="vs market avg" />
        <InfoTile label="Forecast Trend" value={skill.forecast_trend ?? 'N/A'} detail={`${pct(skill.growth_rate)}% growth`} />
        <InfoTile label="Global Adoption" value={`${pct((skill as any).global_adoption ?? (skill as any).global_adoption_score)}%`} detail="dataset signal" />
        <InfoTile className="wide" label="Future Interest" value={pct((skill as any).future_interest ?? skill.forecast_1y)} detail="forecast feature" />
      </div>

      <button className="why-score-button" onClick={() => setShowWhy((value) => !value)}>
        <Plus size={13} /> Why this SES score?
      </button>
      {showWhy && (
        <div className="why-score-panel">
          {reasons.map((reason) => <p key={reason}>{reason}</p>)}
        </div>
      )}

      {tab === 'overview' && (
        <div className="detail-two-col">
          <div className="detail-card wide-card">
            <div className="detail-card-head"><b>Demand History</b><span><TrendingUp size={13} /> {pct(skill.growth_rate)}%</span></div>
            <Sparkline values={sparklinePoints(skill)} height={96} trend={skill.forecast_trend} filled />
          </div>
          <div className="detail-card">
            <b>Related Skills</b>
            {related.map((item) => <p key={item.id}>{item.name}<ChevronRight size={13} /></p>)}
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="detail-card detail-tab-card">
          <b>Forecast outlook</b>
          <InfoTile label="Trend" value={skill.forecast_trend ?? 'N/A'} detail="model label" />
          <InfoTile label="Method" value={skill.forecast_method ?? 'Feature-Based'} detail="forecast model" />
          <InfoTile label="Expected Growth" value={`+${pct(skill.growth_rate)}%`} detail="processed trend" />
        </div>
      )}

      {tab === 'salary' && (
        <div className="detail-card detail-tab-card">
          <b>Salary signal</b>
          <InfoTile label="Estimated Salary" value={`$${Math.round(salaryEstimate(skill) / 1000)}K`} detail="dataset-derived estimate" />
          <InfoTile label="Premium" value={`+${pct(skill.salary_premium)}%`} detail="relative signal" />
          <InfoTile label="Demand" value={demandScore(skill)} detail="market pull" />
        </div>
      )}

      {tab === 'related' && (
        <div className="detail-card">
          <b>Related skills</b>
          {related.map((item) => <p key={item.id}>{item.name}<ChevronRight size={13} /></p>)}
        </div>
      )}

      {tab === 'roadmap' && (
        <div className="detail-card detail-tab-card">
          <b>Roadmap starter</b>
          {['Foundation practice', `Build a ${skill.name} mini project`, 'Add portfolio proof', 'Pair with adjacent high-SES skills'].map((step, index) => (
            <p key={step}><span>{index + 1}.</span> {step}</p>
          ))}
        </div>
      )}

      <div className="detail-card industries">
        <div><b>Top Industries Using This Skill</b><span>View all</span></div>
        <div className="industry-list">
          {industries.map((industry, index) => <p key={industry}>{industry}<b>{Math.max(8, demandScore(skill) - index * 9)}%</b></p>)}
        </div>
      </div>

      <div className="detail-insight">
        <b><Sparkles size={15} /> AI Insight</b>
        <p>{skill.name} is a {riskTier(skill).toLowerCase()} risk skill with {skill.forecast_trend ?? 'tracked'} momentum in your processed dataset.</p>
      </div>
    </aside>
  )
}

function InfoTile({ label, value, detail, className }: { label: string; value: string | number; detail: string; className?: string }) {
  return <div className={cn('info-tile', className)}><span>{label}</span><b>{value}</b><small>{detail}</small></div>
}

function Pill({ children, tone }: { children: ReactNode; tone?: 'green' | 'blue' }) {
  return <span className={cn('skill-pill', tone === 'blue' ? 'blue' : 'green')}>{children}</span>
}

function RiskPill({ tier }: { tier: string }) {
  return <span className={cn('risk-pill', tier.toLowerCase())}>{tier}</span>
}

function Ring({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return <span className="mini-ring" style={{ background: `conic-gradient(#18e0c1 ${clamped * 3.6}deg, rgba(255,255,255,0.16) 0deg)` }} />
}

function Sparkline({ values, trend, height = 34, filled = false }: { values: number[]; trend?: string; height?: number; filled?: boolean }) {
  const width = 126
  const color = normalized(trend) === 'declining' ? '#fb923c' : normalized(trend) === 'stable' ? '#a78bfa' : '#22d3ee'
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - ((value - min) / Math.max(1, max - min)) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')
  const area = `0,${height} ${points} ${width},${height}`
  return <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">{filled && <polygon points={area} fill={color} opacity="0.18" />}<polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

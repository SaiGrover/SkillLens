import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BarChart3, Bot, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Info, Target,
  BrainCircuit, Cloud, Code2, Database, Plus, Search, Shield, Sparkles, Star, TrendingUp, X
} from 'lucide-react'
import { advisorApi, IndustrySummary, industriesApi, SkillSummary, skillsApi } from '@/services/api'
import { cn, rawLinkedInDemandIndex, skillDemandIndex } from '@/lib/utils'
import { externalMarketTrend } from '@/lib/externalBenchmarks'
import { normalizedKey } from '@/lib/display'
import { categoryLabelFor, matchesProductCategory, productCategoryChips } from '@/lib/categoryTaxonomy'

type SortKey = 'relevance' | 'ses' | 'demand' | 'salary' | 'risk'
type DetailTab = 'overview' | 'forecast' | 'salary' | 'related' | 'fit'

const pageSize = 10
const skillDescriptionCache = new globalThis.Map<string, string>()
function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function demandScore(skill: SkillSummary) {
  return skillDemandIndex(skill)
}

function salaryValueIndex(skill: SkillSummary) {
  return Math.round((skill.salary_premium ?? 0) * 100)
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
  return normalizedKey(value)
}

function matchesCategory(skill: SkillSummary, selected: string) {
  return matchesProductCategory(skill.category, selected)
}

function fallbackSkillDescription(skill: SkillSummary) {
  const score = pct(skill.ses_score)
  const demand = demandScore(skill)
  const trend = (externalMarketTrend(skill) ?? 'stable').toLowerCase()
  const strength = score >= 70 ? 'strong relative safety signals' : score >= 50 ? 'a balanced but mixed signal profile' : 'a lower relative safety signal that benefits from careful pairing'
  return `${skill.name} is used in ${categoryLabelFor(skill.category) ?? 'the tracked workforce domain'} and currently shows ${strength}. Its ${trend} outlook is informed by a demand index of ${demand}/100, salary value, adoption, and forecast features; learn it alongside a complementary higher-SES skill that fits your target role.`
}

function skillVisual(category?: string) {
  const normalizedCategory = normalized(category)
  if (normalizedCategory.includes('ai') || normalizedCategory.includes('machine')) return { Icon: BrainCircuit, tone: 'from-fuchsia-500/75 to-violet-500/75' }
  if (normalizedCategory.includes('cloud') || normalizedCategory.includes('devops')) return { Icon: Cloud, tone: 'from-violet-500/75 to-fuchsia-500/75' }
  if (normalizedCategory.includes('data') || normalizedCategory.includes('database')) return { Icon: Database, tone: 'from-emerald-500/75 to-teal-500/75' }
  if (normalizedCategory.includes('security')) return { Icon: Shield, tone: 'from-amber-500/75 to-orange-500/75' }
  return { Icon: Code2, tone: 'from-violet-500/75 to-indigo-500/75' }
}

function exportCsv(rows: SkillSummary[]) {
  const header = ['skill', 'category', 'ses_score', 'risk_tier', 'archetype', 'market_trend', 'salary_value_index_0_to_100', 'demand_index']
  const body = rows.map((skill) => [
    skill.name,
    skill.category ?? '',
    pct(skill.ses_score),
    riskTier(skill),
    skill.archetype ?? '',
    externalMarketTrend(skill) ?? '',
    salaryValueIndex(skill),
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
  const [industry, setIndustry] = useState('All')
  const [industries, setIndustries] = useState<IndustrySummary[]>([])
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
        const [skillRes, categoryRes, industryRes] = await Promise.all([
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
          skillsApi.categories(),
          industriesApi.list().catch(() => []),
        ])
        const items = skillRes.items ?? []
        setSkills(items)
        setSelectedId(null)
        setCategories(Array.from(new Set(['All Skills', ...productCategoryChips.map((chip) => chip.label), ...categoryRes.filter(Boolean).map(categoryLabelFor)])))
        setIndustries(industryRes)
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
    const values = new Set(skills.map((skill) => externalMarketTrend(skill)).filter(Boolean) as string[])
    return ['All', ...Array.from(values)]
  }, [skills])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return skills
      .filter((skill) => !q || [skill.name, skill.category, skill.archetype, externalMarketTrend(skill)].some((value) => value?.toLowerCase().includes(q)))
      .filter((skill) => matchesCategory(skill, category))
      .filter((skill) => {
        if (industry === 'All') return true
        const selectedIndustry = industries.find((item) => item.name === industry)
        return selectedIndustry?.top_skills?.some((name) => normalized(name) === normalized(skill.name)) ?? false
      })
      .filter((skill) => risk === 'All' || riskTier(skill) === risk)
      .filter((skill) => trend === 'All' || externalMarketTrend(skill) === trend)
      .sort((a, b) => {
        if (sortBy === 'ses') return (b.ses_score ?? 0) - (a.ses_score ?? 0)
        if (sortBy === 'demand') return demandScore(b) - demandScore(a)
        if (sortBy === 'salary') return salaryValueIndex(b) - salaryValueIndex(a)
        if (sortBy === 'risk') return riskScore(b) - riskScore(a)
        return (b.ses_score ?? 0) + demandScore(b) / 100 - ((a.ses_score ?? 0) + demandScore(a) / 100)
      })
  }, [skills, search, category, industry, industries, risk, trend, sortBy])

  useEffect(() => {
    setPage(1)
  }, [search, category, industry, risk, trend, sortBy])

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
  const avgSalaryValue = skills.length ? Math.round(skills.reduce((sum, skill) => sum + salaryValueIndex(skill), 0) / skills.length) : 0
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

  const openRecommender = (skill: SkillSummary) => {
    window.localStorage.setItem('skilllens:recommender-skill', skill.name)
    navigate(`/recommender?skill=${encodeURIComponent(skill.id)}`)
  }

  const askAdvisor = (skill: SkillSummary) => {
    window.localStorage.setItem('skilllens:advisor-prompt', `Explain the SES score and forecast outlook for ${skill.name}.`)
    window.localStorage.setItem('skilllens:advisor-context', skill.name)
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
        <SelectBox label="Industry" value={industry} values={['All', ...industries.map((item) => item.name)]} onChange={setIndustry} />
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
            <MetricCard title="Future-Proof" value={skills.filter(isFutureProof).length} detail={`${Math.round((skills.filter(isFutureProof).length / Math.max(1, skills.length)) * 100)}% of total`} tone="fuchsia" />
            <MetricCard title="Growing" value={skills.filter((skill) => normalized(externalMarketTrend(skill)) === 'growing').length} detail="Positive market-aligned trend" tone="emerald" />
            <MetricCard title="High-Risk" value={skills.filter((skill) => riskTier(skill) === 'High').length} detail="Lower SES signals" tone="amber" />
            <MetricCard title="Avg Salary Value" value={`${avgSalaryValue} / 100`} detail="normalized compensation signal" tone="pink" />
            <MetricCard title="Avg Demand Index" value={avgDemand} detail="blended market signal" tone="fuchsia" />
          </div>

          <section className="skill-explorer-table-card glass">
            <div className="skill-explorer-table-actions">
              <div className="skill-explorer-chip-row">
                {productCategoryChips.map((chip) => (
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
                <div
                  className="skill-compare-grid"
                  style={{ gridTemplateColumns: `minmax(128px, 0.8fr) repeat(${Math.max(compareSkills.length, 1)}, minmax(132px, 1fr))` }}
                >
                  <span className="skill-compare-corner">Metric</span>
                  {compareSkills.map((skill) => <b className="skill-compare-skill" key={skill.id}>{skill.name}</b>)}
                  {[
                    ['SES', (skill: SkillSummary) => pct(skill.ses_score)],
                    ['Demand', demandScore],
                    ['Salary Value', (skill: SkillSummary) => `${salaryValueIndex(skill)} / 100`],
                    ['Risk', riskTier],
                    ['Future Interest', (skill: SkillSummary) => `${pct((skill as any).future_interest)}%`],
                    ['Global Adoption', (skill: SkillSummary) => `${pct((skill as any).global_adoption ?? (skill as any).global_adoption_score)}%`],
                  ].flatMap(([label, getter]) => [
                    <span className="skill-compare-label" key={`${label}-label`}>{label as string}</span>,
                    ...compareSkills.map((skill) => <span className="skill-compare-value" key={`${label}-${skill.id}`}>{(getter as (s: SkillSummary) => string | number)(skill)}</span>),
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
                  <span>Salary Value</span>
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
                    <span>{categoryLabelFor(skill.category)}</span>
                    <span className="ses-cell">{pct(skill.ses_score)} <Ring value={pct(skill.ses_score)} /></span>
                    <span><Pill tone="green">{skill.archetype ?? 'Tracked'}</Pill></span>
                    <span><Pill tone="blue">{externalMarketTrend(skill) ?? 'N/A'}</Pill></span>
                    <span>{demandScore(skill)}</span>
                    <span>{salaryValueIndex(skill)} / 100</span>
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
            onRecommend={() => openRecommender(selected)}
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
    </div>
  )
}

function SkillPanel({
  skill,
  skills,
  isSaved,
  onSave,
  onRecommend,
  onCompare,
  onAskAdvisor,
  onExport,
}: {
  skill: SkillSummary
  skills: SkillSummary[]
  isSaved: boolean
  onSave: () => void
  onRecommend: () => void
  onCompare: () => void
  onAskAdvisor: () => void
  onExport: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [showWhy, setShowWhy] = useState(false)
  const [description, setDescription] = useState(() => skillDescriptionCache.get(skill.id) ?? '')
  const [descriptionLoading, setDescriptionLoading] = useState(!skillDescriptionCache.has(skill.id))
  const [history, setHistory] = useState<{ year: number; demand: number }[]>([])
  const related = skills.filter((item) => item.id !== skill.id && item.category === skill.category).slice(0, 4)
  const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Education']
  const reasons = [
    `Composite Demand Index: ${demandScore(skill)}/100`,
    `Raw LinkedIn demand share: ${rawLinkedInDemandIndex(skill)}/100`,
    `Global adoption signal: ${pct((skill as any).global_adoption ?? (skill as any).global_adoption_score)}%`,
    `Future interest signal: ${pct((skill as any).future_interest)}%`,
    `Salary value index: ${salaryValueIndex(skill)} out of 100`,
    `Market trend: ${externalMarketTrend(skill) ?? 'Tracked'} via ${skill.forecast_method ?? 'dataset method'}`,
  ]
  const visual = skillVisual(skill.category)
  const CategoryIcon = visual.Icon
  const currentDemand = demandScore(skill)
  const fallbackProjection = [
    Math.max(0, currentDemand - Math.round(pct(skill.growth_rate) * 0.25)),
    currentDemand,
    Math.max(0, Math.min(100, currentDemand + Math.round(pct(skill.growth_rate) * 0.5))),
    Math.max(0, Math.min(100, currentDemand + pct(skill.growth_rate))),
  ]
  const projectedDemand = useMemo(() => {
    if (!history.length) return fallbackProjection
    const rawForecast = skill.forecast_1y ?? history[history.length - 1].demand
    const peak = Math.max(1, ...history.map((item) => item.demand), rawForecast)
    const recent = history.slice(-3).map((item) => Math.round(item.demand / peak * 100))
    const oneYear = Math.round(rawForecast / peak * 100)
    const twoYear = Math.max(0, Math.min(100, oneYear + Math.round(pct(skill.growth_rate) * 0.5)))
    return [...recent, oneYear, twoYear, Math.max(0, Math.min(100, oneYear + pct(skill.growth_rate)))]
  }, [fallbackProjection, history, skill.forecast_1y, skill.growth_rate])

  useEffect(() => {
    let cancelled = false
    const cached = skillDescriptionCache.get(skill.id)
    if (cached) {
      setDescription(cached)
      setDescriptionLoading(false)
      return () => { cancelled = true }
    }

    setDescription('')
    setDescriptionLoading(true)
    advisorApi.chat(`Write exactly two concise sentences explaining what ${skill.name} is used for and why its workforce outlook matters. Ground it in this data only: category ${skill.category ?? 'Unassigned'}, SES ${pct(skill.ses_score)}/100, calibrated demand index ${demandScore(skill)}/100, raw LinkedIn demand ${rawLinkedInDemandIndex(skill)}/100, market trend ${externalMarketTrend(skill) ?? 'tracked'}. Do not mention being an AI or repeat the prompt.`)
      .then((response) => response.reply?.replace(/\s+/g, ' ').trim())
      .then((summary) => {
        const next = summary && summary.length > 45 ? summary : fallbackSkillDescription(skill)
        skillDescriptionCache.set(skill.id, next)
        if (!cancelled) setDescription(next)
      })
      .catch(() => {
        const next = fallbackSkillDescription(skill)
        skillDescriptionCache.set(skill.id, next)
        if (!cancelled) setDescription(next)
      })
      .finally(() => { if (!cancelled) setDescriptionLoading(false) })

    return () => { cancelled = true }
  }, [skill])

  useEffect(() => {
    let cancelled = false
    skillsApi.history(skill.id)
      .then((rows) => { if (!cancelled) setHistory(rows.map(({ year, demand }) => ({ year, demand }))) })
      .catch(() => { if (!cancelled) setHistory([]) })
    return () => { cancelled = true }
  }, [skill.id])

  return (
    <aside className="skill-explorer-detail-panel glass">
      <div className="detail-top">
        <div className={cn('skill-logo bg-gradient-to-br', visual.tone)}><CategoryIcon size={24} aria-label={`${categoryLabelFor(skill.category)} icon`} /></div>
        <div>
          <h2>{skill.name}</h2>
          <div className="detail-tags"><Pill tone="blue">{categoryLabelFor(skill.category)}</Pill><Pill tone="green">{isFutureProof(skill) ? 'Future-Proof' : externalMarketTrend(skill) ?? 'Tracked'}</Pill></div>
        </div>
        <button type="button" onClick={onSave} className={cn('detail-save-button', isSaved && 'saved')} title={isSaved ? 'Remove from saved skills' : 'Save skill'}>
          <Star size={20} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="detail-description">
        {descriptionLoading ? 'Building a data-grounded skill summary...' : description}
      </p>

      <div className="detail-actions">
        <button onClick={onRecommend}><Target size={13} /> Use in Recommender</button>
        <button onClick={onCompare}><BarChart3 size={13} /> Compare</button>
        <button onClick={onAskAdvisor}><Bot size={13} /> Ask AI</button>
        <button onClick={onExport}><Download size={13} /> Report</button>
      </div>

      <div className="detail-tabs">
        {(['overview', 'forecast', 'salary', 'related', 'fit'] as DetailTab[]).map((item) => (
          <button key={item} onClick={() => setTab(item)} className={cn(tab === item && 'active')}>
            {item}
          </button>
        ))}
      </div>

      <div className="detail-score-grid">
        <div className="score-ring"><b>{pct(skill.ses_score)}</b><span>SES Score</span><small>{skill.ses_tier ?? 'Scored'}</small></div>
        <InfoTile label="Demand Index" value={demandScore(skill)} detail="LinkedIn + adoption + forecast" />
        <InfoTile label="Salary Value Index" value={`${salaryValueIndex(skill)} / 100`} detail="normalized dataset signal" />
        <InfoTile label="Market Trend" value={externalMarketTrend(skill) ?? 'N/A'} detail={`${pct(skill.growth_rate)}% growth`} />
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
            <div className="detail-card-head"><b>Measured Trend Signal</b><span><TrendingUp size={13} /> {pct(skill.growth_rate)}%</span></div>
            <p className="mt-3 text-sm leading-relaxed text-white/55">{externalMarketTrend(skill) ?? 'No'} market trend combines the canonical forecast with external benchmark checks; model method: {skill.forecast_method ?? 'recorded dataset method'}.</p>
          </div>
          <div className="detail-card">
            <b>Related Skills</b>
            {related.map((item) => <p key={item.id}>{item.name}<ChevronRight size={13} /></p>)}
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="detail-card detail-tab-card">
          <div className="detail-card-head"><b>Forecast outlook</b><span>{skill.forecast_method ?? 'Feature-Based'}</span></div>
          <div className="mt-4 rounded-lg border border-white/8 bg-[#10071d]/70 p-3">
            <div className="flex items-center justify-between gap-3 text-xs text-white/45"><span>Relative demand index</span><span>Current to 3-year outlook</span></div>
            <div className="mt-2 h-16"><Sparkline values={projectedDemand} trend={externalMarketTrend(skill)} height={64} filled /></div>
            <div className="mt-1 flex justify-between text-[10px] text-white/35"><span>{history.length ? 'History' : 'Current'}</span><span>{history.length ? 'History' : '1Y'}</span><span>1Y</span><span>3Y</span></div>
          </div>
          <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-relaxed text-white/45">
            Interpretation: the sparkline shows relative direction for this skill inside its local detail view. Rising shape suggests improving forecast position; flat or falling shape means the skill should be paired with stronger adjacent capabilities before treating it as a priority.
          </div>
          <InfoTile label="Trend" value={externalMarketTrend(skill) ?? 'N/A'} detail="market-aligned label" />
          <InfoTile label="Method" value={skill.forecast_method ?? 'Feature-Based'} detail="forecast model" />
          <InfoTile label="Expected Growth" value={`+${pct(skill.growth_rate)}%`} detail="processed trend" />
          <p className="mt-3 text-xs leading-relaxed text-white/42">The path is a relative index based on the current demand signal and recorded growth rate; confidence bands are available on the Forecasts page.</p>
        </div>
      )}

      {tab === 'salary' && (
        <div className="detail-card detail-tab-card">
          <b>Salary signal</b>
          <InfoTile label="Salary Value Index" value={`${salaryValueIndex(skill)} / 100`} detail="normalized dataset signal" />
          <InfoTile label="Demand Index" value={demandScore(skill)} detail="composite market pull" />
        </div>
      )}

      {tab === 'related' && (
        <div className="detail-card">
          <b>Related skills</b>
          {related.map((item) => <p key={item.id}><span className="flex items-center gap-2"><Ring value={pct(item.ses_score)} />{item.name}<small className="text-white/35">SES {pct(item.ses_score)} - Demand {demandScore(item)}</small></span><ChevronRight size={13} /></p>)}
        </div>
      )}

      {tab === 'fit' && (
        <div className="detail-card detail-tab-card">
          <b>Where this skill fits best</b>
          {[
            `${skill.name} is strongest for ${formatFitCategory(skill.category)} work.`,
            `Pair it with ${related.slice(0, 2).map((item) => item.name).join(' and ') || 'adjacent high-SES skills'} for a more complete profile.`,
            `Use the Skill Recommender to test whether it fits your exact role or requirement.`,
          ].map((step, index) => (
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
        <p>{skill.name} is a {riskTier(skill).toLowerCase()} risk skill with {externalMarketTrend(skill) ?? 'tracked'} market momentum in the calibrated dashboard view.</p>
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

function formatFitCategory(category?: string) {
  const value = category?.replace(/_/g, ' / ') ?? 'your target'
  if (/data/i.test(value)) return 'analytics, reporting, and data workflow'
  if (/cloud|devops/i.test(value)) return 'infrastructure, deployment, and reliability'
  if (/ai|machine/i.test(value)) return 'AI, modeling, and intelligent-product'
  if (/security/i.test(value)) return 'security, risk, and protection'
  if (/program|software/i.test(value)) return 'software-building and product engineering'
  return `${value.toLowerCase()}`
}

function Ring({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return <span className="mini-ring" style={{ background: `conic-gradient(#18e0c1 ${clamped * 3.6}deg, rgba(255,255,255,0.16) 0deg)` }} />
}

function Sparkline({ values, trend, height = 34, filled = false }: { values: number[]; trend?: string; height?: number; filled?: boolean }) {
  const width = 126
  const color = normalized(trend) === 'declining' ? '#fb923c' : normalized(trend) === 'stable' ? '#a78bfa' : '#d8b4fe'
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

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Briefcase, Gauge, LayoutDashboard,
  ShieldCheck, Sparkles, TrendingUp
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import StatCard from '@/components/ui/StatCard'
import DemandChart from '@/components/charts/DemandChart'
import SalaryChart from '@/components/charts/SalaryChart'
import {
  approachApi, forecastApi, industriesApi, skillsApi,
  LeaderboardEntry, PipelineStats, SkillSummary
} from '@/services/api'
import { rawLinkedInDemandIndex, skillDemandIndex } from '@/lib/utils'
import { externalMarketTrend } from '@/lib/externalBenchmarks'

const trackedSkillIds = ['artificial-intelligence', 'machine-learning', 'natural-language-processing', 'power-bi', 'python', 'javascript']
const trackedSeries = [
  { key: 'artificial-intelligence', name: 'Artificial Intelligence', color: '#f0abfc' },
  { key: 'machine-learning', name: 'Machine Learning', color: '#c084fc' },
  { key: 'natural-language-processing', name: 'NLP', color: '#a78bfa' },
  { key: 'power-bi', name: 'Power BI', color: '#f472b6' },
  { key: 'python', name: 'Python', color: '#e879f9' },
  { key: 'javascript', name: 'JavaScript', color: '#fde047' },
]
const pieColors = ['#a855f7', '#9333ea', '#c084fc', '#7e22ce', '#d946ef', '#6b21a8']

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function safetyTier(score?: number) {
  const safety = score ?? 0.5
  if (safety >= 0.7) return 'Very safe'
  if (safety >= 0.5) return 'Moderate'
  return 'Low'
}

function normalizeSkillName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function isGenericAliasSkill(skill: SkillSummary) {
  const normalized = normalizeSkillName(skill.name)
  return [
    'database',
    'databases',
    'database management',
    'programming',
    'programming languages',
    'coding',
    'information technology',
  ].includes(normalized)
}

function canonicalWatchKey(skill: SkillSummary) {
  const normalized = normalizeSkillName(skill.name)
  if (['database', 'databases', 'database management'].includes(normalized)) return 'database-family'
  if (['microsoft excel', 'advanced excel'].includes(normalized)) return 'excel'
  if (['sql server', 'postgresql', 'mysql', 'oracle'].includes(normalized)) return normalized
  return normalized
}

function formatCategoryLabel(category?: string) {
  return (category ?? 'Unassigned')
    .replace(/_/g, ' / ')
    .replace(/\bAi\b/g, 'AI')
    .replace(/\bMl\b/g, 'ML')
}

function bucketLabel(from: number, to: number) {
  if (to <= 30) return 'Risk exposure'
  if (to <= 50) return 'Needs monitoring'
  if (to <= 70) return 'Stable safety'
  return 'Future-ready'
}

function bucketColor(from: number, to: number) {
  if (to <= 30) return '#fb7185'
  if (to <= 50) return '#f59e0b'
  if (to <= 70) return '#c084fc'
  return '#34d399'
}

function watchReason(skill: SkillSummary) {
  const trend = externalMarketTrend(skill) ? `${externalMarketTrend(skill)?.toLowerCase()} market trend` : 'limited trend signal'
  return `${trend}; review before treating this as a learning priority`
}

function shortSkillLabel(name: string) {
  const normalized = name.toLowerCase()
  if (normalized === 'artificial intelligence') return 'AI'
  if (normalized === 'machine learning') return 'ML'
  if (normalized === 'natural language processing') return 'NLP'
  if (normalized === 'power bi') return 'Power BI'
  if (normalized === 'javascript') return 'JS'
  return name
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [rising, setRising] = useState<SkillSummary[]>([])
  const [watch, setWatch] = useState<SkillSummary[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [demandData, setDemandData] = useState<any[]>([])
  const [salaryData, setSalaryData] = useState<any[]>([])
  const [industryCount, setIndustryCount] = useState(0)
  const [signalCategory, setSignalCategory] = useState('All')
  const [chartsLoading, setChartsLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)

  useEffect(() => {
    approachApi.stats().then(setStats).catch((err) => console.error('Dashboard stats unavailable:', err))
    industriesApi.list().then((items) => setIndustryCount(items.length)).catch((err) => console.error('Industry count unavailable:', err))

    skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
      .then((skillsRes) => {
        const items = skillsRes.items ?? []
        setSkills(items)
        setSalaryData(trackedSkillIds
          .map((id) => items.find((skill) => skill.id === id))
          .filter(Boolean)
          .map((skill) => ({
            skill: shortSkillLabel(skill!.name),
            fullName: skill!.name,
            premium: Math.round((skill!.salary_premium ?? 0) * 100),
          })))
      })
      .catch((err) => console.error('Skill summary unavailable:', err))

    Promise.all([skillsApi.topRising(5), skillsApi.extinctionRisk(5), forecastApi.futureProofLeaderboard(5)])
      .then(([risingRes, watchRes, futureProof]) => {
        setRising(risingRes)
        setWatch(watchRes)
        setLeaderboard(futureProof)
      })
      .catch((err) => console.error('Dashboard insight lists unavailable:', err))
      .finally(() => setInsightsLoading(false))

    forecastApi.compare(trackedSkillIds)
      .then((compareRes) => {
        const rowsByYear: Record<number, any> = {}
        const comparedSkills = compareRes?.skills ?? []
        const allValues = comparedSkills.flatMap((skill) => [
          ...skill.history.map((point) => point.demand),
          skill.forecast_1y ?? 0,
          skill.forecast_2y ?? 0,
          skill.forecast_3y ?? 0,
        ]).filter((value) => Number.isFinite(value) && value > 0)
        const maxLogValue = Math.max(...allValues.map((value) => Math.log1p(value)), 1)
        const toDemandIndex = (value: number) => {
          const logValue = Math.log1p(Math.max(0, value))
          return Math.round((logValue / maxLogValue) * 100)
        }

        comparedSkills.forEach((skill) => {
          const key = trackedSkillIds.includes(skill.skill_id) ? skill.skill_id : skill.skill_name.toLowerCase().replace(/\W+/g, '_')
          const lastObservedYear = skill.history.length ? Math.max(...skill.history.map((point) => point.year)) : 2025

          skill.history.forEach((point) => {
            if (!rowsByYear[point.year]) rowsByYear[point.year] = { year: point.year, month: String(point.year) }
            rowsByYear[point.year][key] = toDemandIndex(point.demand)
          })
          ;[skill.forecast_1y, skill.forecast_2y, skill.forecast_3y].forEach((forecast, index) => {
            const year = lastObservedYear + index + 1
            if (!rowsByYear[year]) rowsByYear[year] = { year, month: String(year), projected: true }
            rowsByYear[year][key] = toDemandIndex(forecast ?? 0)
          })
        })
        setDemandData(Object.values(rowsByYear).sort((a: any, b: any) => a.year - b.year))
      })
      .catch((err) => console.error('Demand chart unavailable:', err))
      .finally(() => setChartsLoading(false))
  }, [])

  const categoryData = useMemo(() => {
    const counts = skills.reduce<Record<string, number>>((acc, skill) => {
      const label = skill.category || 'Unassigned'
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [skills])

  const avgSafety = skills.length
    ? Math.round((skills.reduce((sum, skill) => sum + (skill.ses_score ?? 0.5), 0) / skills.length) * 1000) / 10
    : 0
  const futureReadySkills = skills.filter((skill) => {
    const archetype = (skill.archetype ?? '').toLowerCase()
    return archetype.includes('future') || archetype.includes('growing')
  })
  const futureReadyShare = skills.length ? Math.round(futureReadySkills.length / skills.length * 100) : 0
  const signalMap = useMemo(() => skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category ?? 'Unassigned',
    categoryLabel: formatCategoryLabel(skill.category),
    safety: Math.round((skill.ses_score ?? 0) * 100),
    demand: skillDemandIndex(skill),
    linkedin: rawLinkedInDemandIndex(skill),
    size: Math.max(1, Math.round((skill.salary_premium ?? 0) * 100)),
  })), [skills])
  const signalCategories = useMemo(() => ['All', ...categoryData.map((item) => item.name)], [categoryData])
  const visibleSignals = useMemo(() => signalMap.filter((skill) => signalCategory === 'All' || skill.category === signalCategory), [signalMap, signalCategory])
  const sesHistogram = useMemo(() => Array.from({ length: 10 }, (_, index) => {
    const from = index * 10
    const to = from + 10
    return { bucket: `${from}-${to}`, count: skills.filter((skill) => {
      const score = Math.round((skill.ses_score ?? 0) * 100)
      return index === 9 ? score >= from && score <= to : score >= from && score < to
    }).length, from, to, tier: bucketLabel(from, to) }
  }), [skills])
  const peakSesBucket = useMemo(() => sesHistogram.reduce((peak, bucket) => bucket.count > peak.count ? bucket : peak, sesHistogram[0] ?? { bucket: 'n/a', count: 0, tier: 'n/a' }), [sesHistogram])
  const watchItems = useMemo(() => {
    const seen = new Set<string>()
    return [...watch, ...skills]
      .filter((skill) => !isGenericAliasSkill(skill))
      .sort((a, b) => (a.ses_score ?? 1) - (b.ses_score ?? 1))
      .filter((skill) => {
        const key = canonicalWatchKey(skill)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  }, [skills, watch])
  const risingItems = useMemo(() => {
    const seen = new Set<string>()
    return [...rising, ...skills]
      .filter((skill) => !isGenericAliasSkill(skill))
      .filter((skill) => (externalMarketTrend(skill) ?? '').toLowerCase() !== 'declining')
      .sort((a, b) => {
        const score = (skill: SkillSummary) => pct(skill.growth_rate) * 0.55 + skillDemandIndex(skill) * 0.3 + pct(skill.future_interest) * 0.15
        return score(b) - score(a)
      })
      .filter((skill) => {
        const key = normalizeSkillName(skill.name)
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 5)
  }, [rising, skills])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title flex flex-wrap items-center gap-2.5">
            <LayoutDashboard size={28} className="text-fuchsia-300" strokeWidth={1.75} /> <span className="heading-shine">Workforce Intelligence Dashboard</span>
          </h1>
          <p className="page-subtitle">
            Analytics generated from your processed skill, forecast, industry, and demand CSV datasets.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55">
          CSV-backed snapshot
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Skills Tracked" value={stats?.total_skills ?? (skills.length || '...')} change="from master skill dataset" positive icon={<Sparkles size={20} />} color="violet" />
        <StatCard label="Industries Covered" value={industryCount || '...'} change="industry analytics" positive icon={<Briefcase size={20} />} color="fuchsia" />
        <StatCard label="Jobs Analyzed" value={stats ? stats.job_postings_processed.toLocaleString() : '...'} change="source records" positive icon={<ShieldCheck size={20} />} color="fuchsia" />
        <StatCard label="Forecast Confidence" value={stats ? `${stats.forecast_accuracy_pct}%` : '...'} change="model confidence signal" positive icon={<Gauge size={20} />} color="violet" />
        <StatCard label="Average Safety Score" value={skills.length ? `${avgSafety}%` : '...'} change="mean SES across skills" positive={avgSafety >= 55} icon={<AlertTriangle size={20} />} color="fuchsia" />
        <StatCard label="Future-Ready Skills" value={skills.length ? futureReadySkills.length : '...'} change={skills.length ? `${futureReadyShare}% Future-Proof or Growing` : 'archetype intelligence'} positive icon={<TrendingUp size={20} />} color="violet" />
      </div>

      <div className="grid xl:grid-cols-[1.45fr_0.85fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {chartsLoading ? <ChartSkeleton /> : <DemandChart data={demandData} series={trackedSeries} title="Log-Scaled Demand Index + 3-Year Outlook" />}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          {!skills.length ? <ChartSkeleton /> : <SalaryChart data={salaryData} />}
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <div className="space-y-4">
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Skills by Category</h3>
          <p className="mb-4 text-xs text-white/38">Ranked by the number of canonical skills; select a category to filter the signal map.</p>
          <div className="grid sm:grid-cols-[180px_1fr] gap-5 items-center">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 2, right: 8, bottom: 2, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={98} tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#10071d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff7ff' }}
                  labelStyle={{ color: '#fff7ff' }}
                  itemStyle={{ color: '#e9d5ff' }}
                  formatter={(value: number) => [`${value} skills`, 'Tracked']}
                />
                <Bar dataKey="value" fill="#a855f7" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {categoryData.map((item, index) => (
                <button key={item.name} type="button" onClick={() => setSignalCategory(item.name)} className={`flex w-full items-center justify-between gap-4 rounded-md px-1.5 py-1 text-left text-sm transition-colors ${signalCategory === item.name ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'}`}>
                  <span className="flex items-center gap-2 text-white/65">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                    {item.name}
                  </span>
                  <span className="font-medium text-white">{item.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white/85">SES Score Distribution</h3>
              <p className="mt-1 text-xs text-white/38">X-axis: SES safety buckets. Y-axis: number of canonical skills in each bucket.</p>
            </div>
            <span className="shrink-0 text-[10px] text-white/35">CSV snapshot</span>
          </div>
          {skills.length ? (
            <>
              <ResponsiveContainer width="100%" height={215}>
                <BarChart data={sesHistogram} margin={{ top: 8, right: 8, bottom: 30, left: 12 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: 'SES score bucket: 0 = highest risk, 100 = strongest safety', position: 'insideBottom', offset: -18, fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'rgba(255,255,255,0.48)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                    label={{ value: 'Skills', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
                  />
                  <Tooltip content={<SesHistogramTooltip />} cursor={{ fill: 'rgba(255,255,255,0.035)' }} />
                  <Bar dataKey="count" name="Skills" radius={[5, 5, 0, 0]}>
                    {sesHistogram.map((bucket) => (
                      <Cell key={bucket.bucket} fill={bucketColor(bucket.from, bucket.to)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-relaxed text-white/48">
                Interpretation: the largest group is <span className="font-semibold text-fuchsia-100">{peakSesBucket.bucket}</span> with <span className="font-semibold text-white">{peakSesBucket.count}</span> skills. This chart shows model safety distribution, not demand volume; low buckets mean the skill needs evidence review or normalization, not that the whole domain is obsolete.
              </div>
            </>
          ) : <ChartSkeleton />}
        </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {insightsLoading ? <ListSkeleton /> : <ListPanel title="Rising Fast" tone="emerald" items={risingItems.map((skill) => ({
            name: skill.name,
            meta: `+${pct(skill.growth_rate)}% growth`,
            score: Math.max(pct(skill.growth_rate), skillDemandIndex(skill)),
            badge: formatCategoryLabel(skill.category ?? skill.archetype ?? 'Momentum'),
            reason: `${externalMarketTrend(skill) ?? 'Tracked'} market trend; calibrated demand index ${skillDemandIndex(skill)}/100`,
          }))} />}
          {insightsLoading ? <ListSkeleton /> : <ListPanel title="Skills to Review" tone="amber" items={watchItems.map((skill) => ({
            name: skill.name,
            meta: `${safetyTier(skill.ses_score)} safety`,
            score: Math.max(0, 100 - pct(skill.ses_score)),
            badge: externalMarketTrend(skill) ?? 'Review',
            reason: watchReason(skill),
          }))} />}
        </div>
      </div>

      <div className="glass rounded-xl border border-white/5 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Skill signal map</h3>
            <p className="mt-1 text-xs text-white/35">Click a point to inspect that skill. Horizontal position is SES; vertical position is composite Demand Index; bubble size is salary value.</p>
          </div>
          <div className="flex max-w-full flex-wrap gap-1.5">
            {signalCategories.map((category) => <button key={category} type="button" onClick={() => setSignalCategory(category)} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${signalCategory === category ? 'border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100' : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75'}`}>{formatCategoryLabel(category)}</button>)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={290}>
          <ScatterChart margin={{ top: 12, right: 22, bottom: 12, left: 3 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" />
            <XAxis type="number" dataKey="safety" name="SES Score" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'SES Score', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.52)', fontSize: 10 }} />
            <YAxis type="number" dataKey="demand" name="Demand Index" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} width={34} label={{ value: 'Demand Index', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.52)', fontSize: 10 }} />
            <ZAxis type="number" dataKey="size" name="Salary value" range={[80, 460]} />
            <Tooltip content={<SignalMapTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '3 3' }} />
            <Scatter name="Skills" data={visibleSignals} fill="#e9d5ff" fillOpacity={0.76} onClick={(point: any) => point?.payload?.name && navigate(`/skills?search=${encodeURIComponent(point.payload.name)}`)} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="glass rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-white/85">Top Future-Proof Skills</h3>
          <span className="text-xs text-white/35">3-year forecast ranking</span>
        </div>
        <div className="grid gap-2">
          {insightsLoading ? <ListSkeleton /> : leaderboard.map((item, index) => (
            <div key={item.skill_id} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">{index + 1}</span>
              <div>
                <p className="font-medium text-white">{item.skill_name}</p>
                <p className="text-xs text-white/35">{item.forecast_trend} - {item.forecast_method}</p>
              </div>
              <span className="text-emerald-300">+{Math.round(item.growth_pct)}%</span>
              <span className="text-white/55">{Math.round(item.confidence * 100)}% confidence</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return <div className="glass flex h-[320px] animate-pulse items-end gap-3 rounded-xl border border-white/5 p-5"><span className="h-[38%] flex-1 rounded bg-white/[0.08]" /><span className="h-[62%] flex-1 rounded bg-white/[0.06]" /><span className="h-[48%] flex-1 rounded bg-white/[0.08]" /><span className="h-[76%] flex-1 rounded bg-white/[0.06]" /></div>
}

function ListSkeleton() {
  return <div className="glass min-h-[185px] animate-pulse rounded-xl border border-white/5 p-5"><div className="h-4 w-24 rounded bg-white/[0.11]" /><div className="mt-5 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-9 rounded bg-white/[0.055]" />)}</div></div>
}


function SignalMapTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null
  const skill = payload[0].payload
  return <div className="rounded-lg border border-white/10 bg-[#10071d] p-3 shadow-xl"><b className="block text-sm text-white">{skill.name}</b><p className="mt-1 text-xs text-white/55">{skill.categoryLabel ?? skill.category}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span className="text-white/45">SES</span><b>{skill.safety} / 100</b><span className="text-white/45">Demand Index</span><b>{skill.demand} / 100</b><span className="text-white/45">Raw LinkedIn</span><b>{skill.linkedin} / 100</b></div><p className="mt-2 max-w-[230px] text-[10px] text-fuchsia-200">Demand Index blends raw employer share, adoption, future interest, growth, and forecast trend.</p></div>
}

function SesHistogramTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]?.payload) return null
  const bucket = payload[0].payload
  return (
    <div className="rounded-lg border border-white/10 bg-[#10071d] p-3 shadow-xl">
      <b className="block text-sm text-white">SES {bucket.bucket}</b>
      <p className="mt-1 text-xs text-white/55">{bucket.count} skills in this range</p>
      <p className="mt-2 text-xs text-fuchsia-200">{bucket.tier}</p>
      <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-white/38">
        SES combines feature intelligence, forecast intelligence, and cluster archetype evidence.
      </p>
    </div>
  )
}

function ListPanel({ title, tone, items }: { title: string; tone: 'emerald' | 'amber'; items: { name: string; meta: string; reason: string; score?: number; badge?: string }[] }) {
  const isRising = tone === 'emerald'
  const toneClass = isRising ? 'text-emerald-200 bg-emerald-400/12 border-emerald-300/20' : 'text-amber-200 bg-amber-400/12 border-amber-300/20'
  const barClass = isRising ? 'from-emerald-300 via-lime-200 to-fuchsia-300' : 'from-amber-300 via-rose-300 to-fuchsia-300'
  const panelGlow = isRising ? 'from-emerald-400/14 via-transparent to-lime-300/7' : 'from-amber-400/14 via-transparent to-rose-400/8'
  const avgScore = items.length ? Math.round(items.reduce((sum, item) => sum + (item.score ?? 0), 0) / items.length) : 0

  return (
    <div className={`glass flex min-h-[390px] flex-col rounded-xl border border-white/5 bg-gradient-to-br ${panelGlow} p-5`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white/90">{title}</h3>
          <p className="mt-1 text-xs text-white/35">{isRising ? 'Momentum leaders from processed growth signals' : 'Low-safety items that need evidence review'}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${toneClass}`}>{avgScore}/100</span>
      </div>
      <div className="grid gap-2.5">
        {items.map((item, index) => (
          <div key={item.name} className="rounded-xl border border-white/8 bg-black/12 p-3 shadow-[inset_0_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${toneClass}`}>{item.meta}</span>
                  {item.badge && <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">{item.badge}</span>}
                </div>
              </div>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${toneClass}`}>{index + 1}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className={`h-full rounded-full bg-gradient-to-r ${barClass}`} style={{ width: `${Math.min(100, Math.max(8, item.score ?? 0))}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-white/34">{item.reason}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs">
        <div className="rounded-lg border border-white/8 bg-white/[0.035] p-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-white/30">{isRising ? 'Signal' : 'Review Type'}</span>
          <b className={isRising ? 'text-emerald-200' : 'text-amber-200'}>{isRising ? 'Growth + Interest' : 'Low SES Evidence'}</b>
        </div>
        <div className="rounded-lg border border-white/8 bg-white/[0.035] p-2">
          <span className="block text-[10px] uppercase tracking-[0.14em] text-white/30">Source</span>
          <b className="text-fuchsia-100">HSEP snapshot</b>
        </div>
      </div>
    </div>
  )
}

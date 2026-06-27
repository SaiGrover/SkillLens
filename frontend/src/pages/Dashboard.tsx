import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Briefcase, Gauge, LayoutDashboard,
  LineChart as LineChartIcon, ShieldCheck, Sparkles
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import StatCard from '@/components/ui/StatCard'
import DemandChart from '@/components/charts/DemandChart'
import SalaryChart from '@/components/charts/SalaryChart'
import {
  approachApi, forecastApi, industriesApi, skillsApi,
  LeaderboardEntry, PipelineStats, SkillSummary
} from '@/services/api'

const trackedSkillIds = ['python', 'javascript', 'react', 'kubernetes']
const trackedSeries = [
  { key: 'python', name: 'Python', color: '#a78bfa' },
  { key: 'javascript', name: 'JavaScript', color: '#c084fc' },
  { key: 'react', name: 'React', color: '#34d399' },
  { key: 'kubernetes', name: 'Kubernetes', color: '#fb923c' },
]
const pieColors = ['#a855f7', '#9333ea', '#c084fc', '#7e22ce', '#d946ef', '#6b21a8']

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function salaryValueIndex(value?: number) {
  return `${Math.round((value ?? 0) * 100)} / 100`
}

function safetyTier(score?: number) {
  const safety = score ?? 0.5
  if (safety >= 0.7) return 'Very safe'
  if (safety >= 0.5) return 'Moderate'
  return 'Low'
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
        setSalaryData(items.filter((skill) => trackedSkillIds.includes(skill.id)).map((skill) => ({
          skill: skill.name,
          premium: Math.round((skill.salary_premium ?? 0) * 100),
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
        const globalPeak = Math.max(1, ...comparedSkills.flatMap((skill) => [
          ...skill.history.map((point) => point.demand),
          skill.forecast_1y ?? 0,
          skill.forecast_2y ?? 0,
          skill.forecast_3y ?? 0,
        ]))
        comparedSkills.forEach((skill) => {
          const key = trackedSkillIds.includes(skill.skill_id) ? skill.skill_id : skill.skill_name.toLowerCase().replace(/\W+/g, '_')
          skill.history.forEach((point) => {
            if (!rowsByYear[point.year]) rowsByYear[point.year] = { year: point.year, month: String(point.year) }
            rowsByYear[point.year][key] = Math.round(point.demand / globalPeak * 100)
          })
          const lastYear = Math.max(...skill.history.map((point) => point.year))
          ;[skill.forecast_1y, skill.forecast_2y, skill.forecast_3y].forEach((forecast, index) => {
            const year = lastYear + index + 1
            if (!rowsByYear[year]) rowsByYear[year] = { year, month: String(year), projected: true }
            rowsByYear[year][key] = Math.round((forecast ?? 0) / globalPeak * 100)
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
  const topSalarySkill = [...skills].sort((a, b) => (b.salary_premium ?? 0) - (a.salary_premium ?? 0))[0]
  const signalMap = useMemo(() => skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category ?? 'Unassigned',
    safety: Math.round((skill.ses_score ?? 0) * 100),
    demand: Math.round((skill.linkedin_demand ?? 0) * 100),
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
    }).length }
  }), [skills])

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
        <StatCard label="Top Earner Skill" value={topSalarySkill?.name ?? '...'} change={topSalarySkill ? `Salary Value Index: ${salaryValueIndex(topSalarySkill.salary_premium)}` : 'normalized compensation signal'} positive icon={<LineChartIcon size={20} />} color="violet" />
      </div>

      <div className="grid xl:grid-cols-[1.45fr_0.85fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {chartsLoading ? <ChartSkeleton /> : <DemandChart data={demandData} series={trackedSeries} title="Historical Demand Index + 3-Year Outlook" />}
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
                <Tooltip contentStyle={{ background: '#10071d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }} formatter={(value: number) => [`${value} skills`, 'Tracked']} />
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
          <div className="mb-2 flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-white/85">SES Score Distribution</h3><p className="mt-1 text-xs text-white/35">How the canonical skill set is distributed across the 0-100 safety scale.</p></div><span className="text-[10px] text-white/35">CSV snapshot</span></div>
          {skills.length ? <ResponsiveContainer width="100%" height={165}><BarChart data={sesHistogram}><CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="bucket" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} /><Tooltip contentStyle={{ background: '#10071d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }} /><Bar dataKey="count" name="Skills" fill="#c084fc" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <ChartSkeleton />}
        </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {insightsLoading ? <ListSkeleton /> : <ListPanel title="Rising Fast" tone="emerald" items={rising.map((skill) => ({
            name: skill.name,
            meta: `+${pct(skill.growth_rate)}% growth`,
            reason: 'positive demand and future interest signals',
          }))} />}
          {insightsLoading ? <ListSkeleton /> : <ListPanel title="Watch List" tone="amber" items={watch.map((skill) => ({
            name: skill.name,
            meta: `${safetyTier(skill.ses_score)} safety`,
            reason: 'lower SES signals or weaker future outlook',
          }))} />}
        </div>
      </div>

      <div className="glass rounded-xl border border-white/5 p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Skill signal map</h3>
            <p className="mt-1 text-xs text-white/35">Click a point to inspect that skill. Horizontal position is SES; vertical position is demand; bubble size is salary value.</p>
          </div>
          <div className="flex max-w-full flex-wrap gap-1.5">
            {signalCategories.map((category) => <button key={category} type="button" onClick={() => setSignalCategory(category)} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${signalCategory === category ? 'border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100' : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75'}`}>{category}</button>)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={290}>
          <ScatterChart margin={{ top: 12, right: 22, bottom: 12, left: 3 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" />
            <XAxis type="number" dataKey="safety" name="SES Score" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'SES Score', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.52)', fontSize: 10 }} />
            <YAxis type="number" dataKey="demand" name="Demand Index" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} width={34} label={{ value: 'Demand', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.52)', fontSize: 10 }} />
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
  return <div className="rounded-lg border border-white/10 bg-[#10071d] p-3 shadow-xl"><b className="block text-sm text-white">{skill.name}</b><p className="mt-1 text-xs text-white/55">{skill.category}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><span className="text-white/45">SES</span><b>{skill.safety} / 100</b><span className="text-white/45">Demand</span><b>{skill.demand} / 100</b></div><p className="mt-2 text-[10px] text-fuchsia-200">Click to open Skill Explorer</p></div>
}

function ListPanel({ title, tone, items }: { title: string; tone: 'emerald' | 'amber'; items: { name: string; meta: string; reason: string }[] }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-300 bg-emerald-400/10' : 'text-amber-300 bg-amber-400/10'

  return (
    <div className="glass rounded-xl border border-white/5 p-5">
      <h3 className="text-sm font-semibold text-white/85 mb-4">{title}</h3>
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.name}</p>
              <p className="text-xs text-white/35">{item.meta}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/28">{item.reason}</p>
            </div>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${toneClass}`}>{index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

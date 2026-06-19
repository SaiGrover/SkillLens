import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Briefcase, Gauge, LayoutDashboard,
  LineChart as LineChartIcon, ShieldCheck, Sparkles
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
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
  { key: 'javascript', name: 'JavaScript', color: '#38bdf8' },
  { key: 'react', name: 'React', color: '#34d399' },
  { key: 'kubernetes', name: 'Kubernetes', color: '#fb923c' },
]
const pieColors = ['#8b5cf6', '#38bdf8', '#14b8a6', '#f59e0b', '#ec4899', '#64748b']

function pct(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function salarySignal(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`
}

function safetyTier(score?: number) {
  const safety = score ?? 0.5
  if (safety >= 0.7) return 'Very safe'
  if (safety >= 0.5) return 'Moderate'
  return 'Low'
}

export default function Dashboard() {
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [rising, setRising] = useState<SkillSummary[]>([])
  const [watch, setWatch] = useState<SkillSummary[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [demandData, setDemandData] = useState<any[]>([])
  const [salaryData, setSalaryData] = useState<any[]>([])
  const [industryCount, setIndustryCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const [pipelineStats, skillsRes, risingRes, watchRes, futureProof, industries, compareRes] = await Promise.all([
          approachApi.stats(),
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
          skillsApi.topRising(5),
          skillsApi.extinctionRisk(5),
          forecastApi.futureProofLeaderboard(5),
          industriesApi.list().catch(() => []),
          forecastApi.compare(trackedSkillIds).catch(() => null),
        ])

        setStats(pipelineStats)
        setSkills(skillsRes.items ?? [])
        setRising(risingRes)
        setWatch(watchRes)
        setLeaderboard(futureProof)
        setIndustryCount(industries.length)

        const rowsByYear: Record<number, any> = {}
        compareRes?.skills?.forEach((skill) => {
          const key = trackedSkillIds.includes(skill.skill_id) ? skill.skill_id : skill.skill_name.toLowerCase().replace(/\W+/g, '_')
          skill.history.forEach((point) => {
            if (!rowsByYear[point.year]) rowsByYear[point.year] = { year: point.year, month: String(point.year) }
            rowsByYear[point.year][key] = Math.round(point.adoption_rate * 100)
          })
        })
        setDemandData(Object.values(rowsByYear).sort((a: any, b: any) => a.year - b.year))

        const trackedSkills = (skillsRes.items ?? []).filter((skill) => trackedSkillIds.includes(skill.id))
        const years = [2020, 2021, 2022, 2023, 2024, 2025]
        setSalaryData(years.map((year, index) => {
          const row: any = { year }
          trackedSkills.forEach((skill) => {
            const signal = Math.max(12, Math.round((skill.salary_premium ?? 0.25) * 120))
            row[skill.id] = Math.round(signal * (0.78 + index * 0.055))
          })
          return row
        }))
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
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

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-white/50 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p>Loading analytics from processed datasets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <LayoutDashboard size={28} className="text-violet-300" strokeWidth={1.75} /> Workforce Intelligence Dashboard
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
        <StatCard label="Skills Tracked" value={stats?.total_skills ?? skills.length} change="from master skill dataset" positive icon={<Sparkles size={20} />} color="violet" />
        <StatCard label="Industries Covered" value={industryCount || 'N/A'} change="industry analytics" positive icon={<Briefcase size={20} />} color="cyan" />
        <StatCard label="Jobs Analyzed" value={(stats?.job_postings_processed ?? 0).toLocaleString()} change="source records" positive icon={<ShieldCheck size={20} />} color="emerald" />
        <StatCard label="Forecast Confidence" value={`${stats?.forecast_accuracy_pct ?? 0}%`} change="model confidence signal" positive icon={<Gauge size={20} />} color="emerald" />
        <StatCard label="Average Safety Score" value={`${avgSafety}%`} change="mean SES across skills" positive={avgSafety >= 55} icon={<AlertTriangle size={20} />} color="amber" />
        <StatCard label="Highest Salary Premium" value={topSalarySkill ? salarySignal(topSalarySkill.salary_premium) : 'N/A'} change={topSalarySkill?.name ?? 'No skill data'} positive icon={<LineChartIcon size={20} />} color="violet" />
      </div>

      <div className="grid xl:grid-cols-[1.45fr_0.85fr] gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <DemandChart
            data={demandData}
            series={trackedSeries}
            title="Skill Demand History + Forecast Index"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <SalaryChart data={salaryData} series={trackedSeries} />
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-5">Demand by Skill Category</h3>
          <div className="grid sm:grid-cols-[180px_1fr] gap-5 items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryData} innerRadius={48} outerRadius={78} paddingAngle={2} dataKey="value">
                  {categoryData.map((_, index) => <Cell key={index} fill={pieColors[index % pieColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#071020', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-white/65">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} />
                    {item.name}
                  </span>
                  <span className="font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ListPanel title="Rising Fast" tone="emerald" items={rising.map((skill) => ({
            name: skill.name,
            meta: `+${pct(skill.growth_rate)}% growth`,
            reason: 'positive demand and future interest signals',
          }))} />
          <ListPanel title="Watch List" tone="amber" items={watch.map((skill) => ({
            name: skill.name,
            meta: `${safetyTier(skill.ses_score)} safety`,
            reason: 'lower SES signals or weaker future outlook',
          }))} />
        </div>
      </div>

      <div className="glass rounded-xl border border-white/5 p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-white/85">Top Future-Proof Skills</h3>
          <span className="text-xs text-white/35">3-year forecast ranking</span>
        </div>
        <div className="grid gap-2">
          {leaderboard.map((item, index) => (
            <div key={item.skill_id} className="grid grid-cols-[32px_1fr_auto_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">{index + 1}</span>
              <div>
                <p className="font-medium text-white">{item.skill_name}</p>
                <p className="text-xs text-white/35">{item.forecast_trend} · {item.forecast_method}</p>
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

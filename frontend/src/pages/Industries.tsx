import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Briefcase, Building2, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { IndustrySummary, industriesApi } from '@/services/api'

type IndustryView = IndustrySummary & {
  avgSes: number
  riskExposure: number
  growth: number
  hiring: number
  trend: string
  topSkill: string
  highRiskSkills: number
}

const shortLabels: Record<string, string> = {
  'Data Analytics': 'Analytics',
  'Software Engineering': 'Software',
  'Data Science': 'Data Sci.',
  'AI/ML': 'AI/ML',
  'Cybersecurity': 'Cyber',
  'Cloud & DevOps': 'Cloud',
  'Data Engineering': 'Data Eng.',
  'System Engineering': 'Systems',
}

function pct(value?: number, fallback = 0) {
  return Math.round((value ?? fallback) * 100)
}

function trendFrom(industry: IndustrySummary) {
  if (industry.forecast) return industry.forecast
  const growth = industry.growth_rate ?? 0
  if (growth > 18) return 'Explosive'
  if (growth > 8) return 'Growing'
  if (growth >= 0) return 'Stable'
  return 'Declining'
}

function riskLabel(value: number) {
  if (value >= 45) return 'High'
  if (value >= 24) return 'Medium'
  return 'Low'
}

function normalizeIndustry(industry: IndustrySummary): IndustryView {
  const avgSes = Math.round((industry.avg_ses ?? industry.hiring_index ?? 0.5) * (industry.avg_ses && industry.avg_ses <= 1 ? 100 : 1))
  const hiring = Math.round(industry.hiring_index ?? avgSes)
  const growth = Math.round(industry.growth_rate ?? 8)
  const riskExposure = Math.round(industry.extinction_risk ?? Math.max(0, 100 - avgSes))
  return {
    ...industry,
    avgSes,
    hiring,
    growth,
    riskExposure,
    trend: trendFrom(industry),
    topSkill: industry.top_skills?.[0] ?? 'Python',
    highRiskSkills: Math.round((industry.skill_count ?? 10) * riskExposure / 100),
  }
}

export default function Industries() {
  const [searchParams] = useSearchParams()
  const [industries, setIndustries] = useState<IndustryView[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadIndustries() {
      try {
        setLoading(true)
        const res = await industriesApi.list()
        const mapped = res.map(normalizeIndustry)
        setIndustries(mapped)
        const requested = searchParams.get('search')?.toLowerCase()
        const matched = requested ? mapped.find((industry) => industry.id.toLowerCase() === requested || industry.name.toLowerCase().includes(requested)) : undefined
        setSelectedId(matched?.id ?? mapped[0]?.id ?? null)
      } catch (err) {
        console.error('Error loading industries:', err)
      } finally {
        setLoading(false)
      }
    }
    loadIndustries()
  }, [searchParams])

  const selected = industries.find((item) => item.id === selectedId) ?? industries[0]
  const chartData = useMemo(() => industries.map((item) => ({
    name: shortLabels[item.name] ?? item.name,
    safety: item.avgSes,
    demand: item.hiring,
  })), [industries])

  const archetype = useMemo(() => {
    if (!selected) return []
    const future = Math.max(10, Math.min(55, Math.round(selected.avgSes * 0.45)))
    const growing = Math.max(12, Math.min(55, Math.round(selected.growth + 28)))
    const stable = Math.max(8, 100 - future - growing - selected.highRiskSkills)
    const risk = Math.max(3, Math.min(30, selected.highRiskSkills))
    return [
      { label: 'Future-Proof', value: future, color: '#14b8a6' },
      { label: 'Growing', value: growing, color: '#38bdf8' },
      { label: 'Stable', value: stable, color: '#a78bfa' },
      { label: 'High-Risk', value: risk, color: '#f59e0b' },
    ]
  }, [selected])

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-white/50 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p>Loading industry analytics from processed datasets...</p>
        </div>
      </div>
    )
  }

  if (!selected) return <div className="py-20 text-center text-white/35">No industry data available.</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <Building2 size={26} className="text-emerald-300" strokeWidth={1.75} /> Industry Intelligence
        </h1>
        <p className="page-subtitle">Industry-level SES, demand, forecast growth, risk exposure, and top skill signals.</p>
      </div>

      <div className="grid xl:grid-cols-[360px_1fr] gap-4">
        <div className="space-y-2.5">
          {industries.map((industry, index) => (
            <motion.button
              key={industry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.035 }}
              onClick={() => setSelectedId(industry.id)}
              className={`w-full rounded-xl border p-3 text-left transition-all ${
                selected.id === industry.id
                  ? 'border-violet-400/45 bg-violet-500/18'
                  : 'glass border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{industry.name}</p>
                  <p className="mt-1 text-xs text-white/40">Avg SES: {industry.avgSes} - Top: {industry.topSkill}</p>
                </div>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">
                  {industry.trend}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/45">
                <span>Demand <b className="text-white">{industry.hiring}</b></span>
                <span>Skills <b className="text-white">{industry.skill_count ?? 0}</b></span>
                <span>Risk <b className="text-white">{riskLabel(industry.riskExposure)}</b></span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="space-y-4">
          <section className="glass rounded-xl border border-white/5 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-300/70">Selected industry</p>
                <h2 className="section-title mt-1">{selected.name}</h2>
                <p className="mt-2 max-w-2xl page-subtitle !mt-2">
                  {selected.name} contains {selected.skill_count ?? 0} tracked skills, led by {selected.topSkill}, with {selected.trend.toLowerCase()} forecast momentum.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-sm font-medium text-emerald-200">
                {selected.trend} Growth
              </span>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
              <IndustryMetric icon={Sparkles} label="Average SES" value={selected.avgSes} detail="safety score" />
              <IndustryMetric icon={Briefcase} label="Hiring Demand" value={selected.hiring} detail="demand index" />
              <IndustryMetric icon={TrendingUp} label="Forecast Growth" value={`+${selected.growth}%`} detail="3Y signal" />
              <IndustryMetric icon={ShieldAlert} label="High-Risk Skills" value={selected.highRiskSkills} detail="watch items" />
              <IndustryMetric icon={BarChart3} label="Top Salary Skill" value={selected.topSkill} detail="premium signal" />
            </div>
          </section>

          <div className="grid xl:grid-cols-[1fr_360px] gap-4">
            <section className="glass rounded-xl border border-white/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white/85">Cross-industry comparison</h3>
                <div className="flex items-center gap-4 text-xs text-white/45">
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-violet-400" /> Average SES</span>
                  <span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-cyan-400" /> Hiring Demand</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.44)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#071020', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }} />
                  <Bar dataKey="safety" name="Average SES" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="demand" name="Hiring Demand" fill="#22d3ee" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section className="glass rounded-xl border border-white/5 p-5">
              <h3 className="text-sm font-semibold text-white/85">Archetype distribution</h3>
              <div className="mt-4 overflow-hidden rounded-full bg-white/8 h-4 flex">
                {archetype.map((item) => (
                  <span key={item.label} style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {archetype.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-white/55"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                    <b className="text-white">{item.value}%</b>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wider text-white/35">Top skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selected.top_skills ?? []).slice(0, 8).map((skill) => (
                    <span key={skill} className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200">{skill}</span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function IndustryMetric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.035] p-3">
      <Icon size={16} className="mb-3 text-cyan-300" />
      <p className="text-[10px] uppercase tracking-wider text-white/34">{label}</p>
      <b className="mt-1 block truncate text-xl text-white">{value}</b>
      <span className="text-xs text-white/35">{detail}</span>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { ArrowUpRight, BrainCircuit, LineChart, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react'
import { forecastApi, LeaderboardEntry, MethodDistribution, skillsApi } from '@/services/api'
import StatCard from '@/components/ui/StatCard'

const trendColors: Record<string, string> = {
  explosive: '#ec4899',
  growing: '#22c55e',
  stable: '#c084fc',
  declining: '#f59e0b',
}

function indexScale(entries: LeaderboardEntry[], key: 'forecast_1y' | 'forecast_3y') {
  const values = entries.map((item) => item[key]).filter(Number.isFinite)
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (value: number) => {
    if (!values.length) return 0
    if (max === min) return 72
    return Math.round((42 + ((value - min) / (max - min)) * 48) * 10) / 10
  }
}

function formatGrowth(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value * 10) / 10 : 0
  return `${rounded >= 0 ? '+' : ''}${rounded}%`
}

export default function Forecasts() {
  const [searchParams] = useSearchParams()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [methods, setMethods] = useState<MethodDistribution[]>([])
  const [trends, setTrends] = useState<{ trend: string; count: number; avg_forecast_score: number }[]>([])
  const [trendFilter, setTrendFilter] = useState('All')
  const [methodFilter, setMethodFilter] = useState('All')
  const [confidenceFilter, setConfidenceFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [categoryBySkill, setCategoryBySkill] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadForecasts() {
      try {
        setLoading(true)
        const [leaderboardRes, methodRes, trendRes, skillsRes] = await Promise.all([
          forecastApi.futureProofLeaderboard(20),
          forecastApi.methodDistribution(),
          forecastApi.trendDistribution(),
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
        ])
        setLeaderboard(leaderboardRes)
        setMethods(methodRes)
        setTrends(trendRes)
        setCategoryBySkill(Object.fromEntries((skillsRes.items ?? []).map((skill) => [skill.id, skill.category ?? 'Unassigned'])))
      } catch (err) {
        console.error('Error loading forecasts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadForecasts()
  }, [])

  const oneYearIndex = useMemo(() => indexScale(leaderboard, 'forecast_1y'), [leaderboard])
  const threeYearIndex = useMemo(() => indexScale(leaderboard, 'forecast_3y'), [leaderboard])
  const methodsList = useMemo(() => ['All', ...Array.from(new Set(methods.map((item) => item.method)))], [methods])
  const categoryList = useMemo(() => ['All', ...Array.from(new Set(Object.values(categoryBySkill))).sort()], [categoryBySkill])

  const filteredLeaderboard = useMemo(() => leaderboard.filter((item) => {
    const query = (searchParams.get('q') ?? '').trim().toLowerCase()
    const confidence = Math.round(item.confidence * 100)
    const trendOk = trendFilter === 'All' || item.forecast_trend.toLowerCase() === trendFilter.toLowerCase()
    const methodOk = methodFilter === 'All' || item.forecast_method === methodFilter
    const categoryOk = categoryFilter === 'All' || categoryBySkill[item.skill_id] === categoryFilter
    const confidenceOk = confidenceFilter === 'All'
      || (confidenceFilter === 'High' && confidence >= 80)
      || (confidenceFilter === 'Medium' && confidence >= 60 && confidence < 80)
      || (confidenceFilter === 'Low' && confidence < 60)
    const queryOk = !query || [item.skill_name, item.forecast_method, item.forecast_trend].some((value) => value.toLowerCase().includes(query))
    return trendOk && methodOk && categoryOk && confidenceOk && queryOk
  }), [leaderboard, trendFilter, methodFilter, categoryFilter, categoryBySkill, confidenceFilter, searchParams])

  const chartData = useMemo(() => filteredLeaderboard.slice(0, 8).map((item) => {
    const oneYear = oneYearIndex(item.forecast_1y)
    const threeYear = threeYearIndex(item.forecast_3y)
    const spread = Math.max(4, Math.round((1 - item.confidence) * 18))
    const lowerBand = Math.max(0, threeYear - spread)
    const upperBand = Math.min(100, threeYear + spread)
    return {
      name: item.skill_name,
      oneYear,
      threeYear,
      lowerBand,
      upperBand,
      bandRange: Math.max(0, upperBand - lowerBand),
      confidence: Math.round(item.confidence * 100),
    }
  }), [filteredLeaderboard, oneYearIndex, threeYearIndex])

  const avgConfidence = leaderboard.length
    ? Math.round((leaderboard.reduce((sum, item) => sum + item.confidence, 0) / leaderboard.length) * 100)
    : 0
  const explosiveCount = trends.find((item) => item.trend.toLowerCase() === 'explosive')?.count ?? 0
  const growingCount = trends.find((item) => item.trend.toLowerCase() === 'growing')?.count ?? 0

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-white/50 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p>Loading forecast outputs from processed datasets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <LineChart size={28} className="text-violet-300" strokeWidth={1.75} /> Forecasts
        </h1>
        <p className="page-subtitle">
          Relative 0-100 demand indices derived from the canonical CSV snapshot. Raw forecast demand estimates remain available in exports.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Ranked Forecasts" value={leaderboard.length} change="top demand projections" positive icon={<BrainCircuit size={20} />} color="violet" />
        <StatCard label="Forecast Confidence" value={`${avgConfidence}%`} change="average model confidence" positive={avgConfidence >= 70} icon={<ArrowUpRight size={20} />} color="fuchsia" />
        <StatCard label="Explosive Trends" value={explosiveCount} change="highest growth bucket" positive icon={<TrendingUp size={20} />} color="violet" />
        <StatCard label="Growing Trends" value={growingCount} change="positive forecast bucket" positive icon={<TrendingDown size={20} />} color="fuchsia" />
      </div>

      <div className="glass overflow-visible rounded-xl border border-white/5 p-3">
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-[auto_repeat(4,minmax(150px,1fr))] 2xl:items-center">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/35">
            <SlidersHorizontal size={14} /> Filters
          </div>
          <FilterButtons label="Trend" value={trendFilter} options={['All', 'Explosive', 'Growing', 'Stable', 'Declining']} onChange={setTrendFilter} />
          <FilterButtons label="Method" value={methodFilter} options={methodsList} onChange={setMethodFilter} />
          <FilterButtons label="Category" value={categoryFilter} options={categoryList} onChange={setCategoryFilter} />
          <FilterButtons label="Confidence" value={confidenceFilter} options={['All', 'High', 'Medium', 'Low']} onChange={setConfidenceFilter} />
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.35fr_0.75fr] gap-6">
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/85 mb-1">1Y vs 3Y Forecast Index</h3>
          <p className="mb-4 text-xs text-white/35">Index scale: 0-100 across the canonical snapshot. The purple band shows forecast uncertainty from model confidence.</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="oneYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="threeYear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ForecastIndexTooltip />} />
              <Area type="monotone" dataKey="lowerBand" name="Confidence lower" stroke="transparent" fill="transparent" stackId="band" isAnimationActive={false} />
              <Area type="monotone" dataKey="bandRange" name="Confidence band" stroke="transparent" fill="url(#confidenceBand)" stackId="band" isAnimationActive={false} />
              <Area type="monotone" dataKey="oneYear" name="1-year" stroke="#c084fc" fill="url(#oneYear)" strokeWidth={2} />
              <Area type="monotone" dataKey="threeYear" name="3-year" stroke="#a78bfa" fill="url(#threeYear)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/85 mb-4">Trend Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="trend" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.035)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {trends.map((item) => <Cell key={item.trend} fill={trendColors[item.trend.toLowerCase()] ?? '#8b5cf6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1fr_0.72fr] gap-6">
        <div className="glass rounded-xl border border-white/5 overflow-hidden">
          <div className="grid grid-cols-[1.35fr_repeat(6,minmax(0,0.78fr))] gap-3 border-b border-white/5 px-5 py-3 text-xs uppercase tracking-wider text-white/35">
            <span>Skill</span>
            <span>1Y Index</span>
            <span>3Y Index</span>
            <span>Growth</span>
            <span>Trend</span>
            <span>Method</span>
            <span>Confidence</span>
          </div>
          {filteredLeaderboard.slice(0, 12).map((item) => {
            const oneYear = oneYearIndex(item.forecast_1y)
            const threeYear = threeYearIndex(item.forecast_3y)
            return (
            <div key={item.skill_id} className="grid grid-cols-[1.35fr_repeat(6,minmax(0,0.78fr))] gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-b-0">
              <div>
                <p className="font-medium text-white">{item.skill_name}</p>
                <p className="text-xs text-white/35">{item.skill_id}</p>
              </div>
              <span className="text-fuchsia-300">{oneYear.toFixed(1)}</span>
              <span className="text-violet-300">{threeYear.toFixed(1)}</span>
              <span className={item.growth_pct < 0 ? 'text-amber-300' : 'text-emerald-300'}>{formatGrowth(item.growth_pct)}</span>
              <span className="capitalize text-white/65">{item.forecast_trend}</span>
              <span className="text-white/55">{item.forecast_method}</span>
              <span className="text-emerald-300">{Math.round(item.confidence * 100)}%</span>
            </div>
            )
          })}
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/85 mb-4">Forecast Methods</h3>
          <div className="space-y-3">
            {methods.map((method) => (
              <div key={method.method} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{method.method}</p>
                  <span className="text-xs text-emerald-300">{Math.round(method.avg_confidence * 100)}%</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{method.description}</p>
                <p className="mt-2 text-xs text-white/35">{method.count} skills</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ForecastIndexTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload ?? {}
  return (
    <div className="forecast-tooltip">
      <b>{label}</b>
      <p><span>1-year index</span><strong>{row.oneYear?.toFixed?.(1) ?? row.oneYear}</strong></p>
      <p><span>3-year index</span><strong>{row.threeYear?.toFixed?.(1) ?? row.threeYear}</strong></p>
      <p><span>Confidence</span><strong>{row.confidence}%</strong></p>
    </div>
  )
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const count = payload[0]?.value ?? 0
  return (
    <div className="forecast-tooltip">
      <b>{label}</b>
      <p><span>Skills</span><strong>{count}</strong></p>
    </div>
  )
}

function FilterButtons({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <div className="flex flex-wrap gap-1 overflow-visible">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              value === option
                ? 'border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200'
                : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

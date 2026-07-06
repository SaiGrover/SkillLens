import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from 'recharts'
import { ArrowUpRight, BrainCircuit, LineChart, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react'
import { forecastApi, LeaderboardEntry, MethodDistribution, skillsApi } from '@/services/api'
import StatCard from '@/components/ui/StatCard'
import { forecastTrendFromGrowth, formatCategoryLabel, formatForecastGrowth, formatForecastMethod } from '@/lib/display'

const trendColors: Record<string, string> = {
  explosive: '#ec4899',
  growing: '#22c55e',
  stable: '#c084fc',
  declining: '#f59e0b',
}

function indexScale(entries: LeaderboardEntry[]) {
  const values = entries.flatMap((item) => [item.forecast_1y, item.forecast_3y]).filter(Number.isFinite)
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

function displayForecastGrowth(oneYear: number, threeYear: number) {
  return formatForecastGrowth(oneYear, threeYear)
}

export default function Forecasts() {
  const [searchParams] = useSearchParams()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [methods, setMethods] = useState<MethodDistribution[]>([])
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
        const [leaderboardRes, methodRes, skillsRes] = await Promise.all([
          forecastApi.futureProofLeaderboard(20),
          forecastApi.methodDistribution(),
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
        ])
        setLeaderboard(leaderboardRes)
        setMethods(methodRes)
        setCategoryBySkill(Object.fromEntries((skillsRes.items ?? []).map((skill) => [skill.id, formatCategoryLabel(skill.category)])))
      } catch (err) {
        console.error('Error loading forecasts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadForecasts()
  }, [])

  const forecastIndex = useMemo(() => indexScale(leaderboard), [leaderboard])
  const methodsList = useMemo(() => ['All', ...Array.from(new Set(methods.map((item) => item.method)))], [methods])
  const categoryList = useMemo(() => ['All', ...Array.from(new Set(Object.values(categoryBySkill))).sort()], [categoryBySkill])

  const filteredLeaderboard = useMemo(() => leaderboard.filter((item) => {
    const query = (searchParams.get('q') ?? '').trim().toLowerCase()
    const confidence = Math.round(item.confidence * 100)
    const visibleGrowth = displayForecastGrowth(forecastIndex(item.forecast_1y), forecastIndex(item.forecast_3y))
    const visibleTrend = forecastTrendFromGrowth(visibleGrowth)
    const trendOk = trendFilter === 'All' || visibleTrend.toLowerCase() === trendFilter.toLowerCase()
    const methodOk = methodFilter === 'All' || item.forecast_method === methodFilter
    const categoryOk = categoryFilter === 'All' || categoryBySkill[item.skill_id] === categoryFilter
    const confidenceOk = confidenceFilter === 'All'
      || (confidenceFilter === 'High' && confidence >= 80)
      || (confidenceFilter === 'Medium' && confidence >= 60 && confidence < 80)
      || (confidenceFilter === 'Low' && confidence < 60)
    const queryOk = !query || [item.skill_name, item.forecast_method, visibleTrend].some((value) => value.toLowerCase().includes(query))
    return trendOk && methodOk && categoryOk && confidenceOk && queryOk
  }), [leaderboard, forecastIndex, trendFilter, methodFilter, categoryFilter, categoryBySkill, confidenceFilter, searchParams])

  const filteredTrendData = useMemo(() => {
    const counts = filteredLeaderboard.reduce<Record<string, { trend: string; count: number; avg_forecast_score: number }>>((result, item) => {
      const oneYear = forecastIndex(item.forecast_1y)
      const threeYear = forecastIndex(item.forecast_3y)
      const trend = forecastTrendFromGrowth(displayForecastGrowth(oneYear, threeYear))
      const current = result[trend] ?? { trend, count: 0, avg_forecast_score: 0 }
      current.count += 1
      current.avg_forecast_score += threeYear
      result[trend] = current
      return result
    }, {})

    return Object.values(counts).map((item) => ({
      ...item,
      avg_forecast_score: item.count ? item.avg_forecast_score / item.count : 0,
    }))
  }, [filteredLeaderboard, forecastIndex])

  const filteredMethodData = useMemo(() => {
    const counts = filteredLeaderboard.reduce<Record<string, { method: string; count: number; confidence: number }>>((result, item) => {
      const current = result[item.forecast_method] ?? { method: item.forecast_method, count: 0, confidence: 0 }
      current.count += 1
      current.confidence += item.confidence
      result[item.forecast_method] = current
      return result
    }, {})

    return Object.values(counts).map((item) => ({
      method: item.method,
      count: item.count,
      avg_confidence: item.count ? item.confidence / item.count : 0,
      description: methods.find((method) => method.method === item.method)?.description ?? 'Forecast method from the filtered result set',
    }))
  }, [filteredLeaderboard, methods])

  const chartData = useMemo(() => filteredLeaderboard.slice(0, 8).map((item) => {
    const oneYear = forecastIndex(item.forecast_1y)
    const threeYear = forecastIndex(item.forecast_3y)
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
  }), [filteredLeaderboard, forecastIndex])

  const avgConfidence = filteredLeaderboard.length
    ? Math.round((filteredLeaderboard.reduce((sum, item) => sum + item.confidence, 0) / filteredLeaderboard.length) * 100)
    : 0
  const growingCount = filteredTrendData.find((item) => item.trend.toLowerCase() === 'growing')?.count ?? 0
  const decliningCount = filteredTrendData.find((item) => item.trend.toLowerCase() === 'declining')?.count ?? 0
  const leadingForecast = filteredLeaderboard[0]
  const dominantTrend = [...filteredTrendData].sort((a, b) => b.count - a.count)[0]

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
        <StatCard label="Matching Forecasts" value={filteredLeaderboard.length} change={`${leaderboard.length} total forecast rows`} positive icon={<BrainCircuit size={20} />} color="violet" />
        <StatCard label="Filtered Confidence" value={filteredLeaderboard.length ? `${avgConfidence}%` : '...'} change="average for current filters" positive={avgConfidence >= 70} icon={<ArrowUpRight size={20} />} color="fuchsia" />
        <StatCard label="Growing Trends" value={growingCount} change="positive index movement" positive icon={<TrendingUp size={20} />} color="violet" />
        <StatCard label="Declining Trends" value={decliningCount} change="negative index movement" positive={decliningCount === 0} icon={<TrendingDown size={20} />} color="fuchsia" />
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
          {chartData.length ? <ResponsiveContainer width="100%" height={280}>
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
          </ResponsiveContainer> : <EmptyForecastState title="No forecast rows match these filters" detail="Loosen one filter to compare 1Y and 3Y index movement." />}
          {chartData.length > 0 && leadingForecast && (
            <ChartInterpretation>
              Interpretation: the current filters return <b>{filteredLeaderboard.length}</b> forecast rows. The chart compares the top visible rows on one shared 0-100 index, so a falling 3Y line means the skill loses relative position inside this filtered group even if raw demand is still large.
            </ChartInterpretation>
          )}
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/85 mb-4">Trend Distribution</h3>
          {filteredTrendData.length ? <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="trend" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TrendTooltip />} cursor={{ fill: 'rgba(255,255,255,0.035)' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {filteredTrendData.map((item) => <Cell key={item.trend} fill={trendColors[item.trend.toLowerCase()] ?? '#8b5cf6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer> : <EmptyForecastState title="No trend distribution" detail="The current filters remove every forecast row." />}
          {dominantTrend && (
            <ChartInterpretation>
              Interpretation: <b>{dominantTrend.trend}</b> is the dominant visible trend with <b>{dominantTrend.count}</b> matching skills. This distribution is recalculated from the active filters, so it should change whenever trend, method, category, confidence, or search changes.
            </ChartInterpretation>
          )}
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
            const oneYear = forecastIndex(item.forecast_1y)
            const threeYear = forecastIndex(item.forecast_3y)
            const visibleGrowth = displayForecastGrowth(oneYear, threeYear)
            const visibleTrend = forecastTrendFromGrowth(visibleGrowth)
            return (
            <div key={item.skill_id} className="grid grid-cols-[1.35fr_repeat(6,minmax(0,0.78fr))] gap-3 border-b border-white/5 px-5 py-3 text-sm last:border-b-0">
              <div>
                <p className="font-medium text-white">{item.skill_name}</p>
                <p className="text-xs text-white/35">{item.skill_id}</p>
              </div>
              <span className="text-fuchsia-300">{oneYear.toFixed(1)}</span>
              <span className="text-violet-300">{threeYear.toFixed(1)}</span>
              <span className={visibleGrowth < 0 ? 'text-amber-300' : 'text-emerald-300'}>{formatGrowth(visibleGrowth)}</span>
              <span className="capitalize text-white/65">{visibleTrend}</span>
              <span className="text-white/55">{formatForecastMethod(item.forecast_method)}</span>
              <span className="text-emerald-300">{Math.round(item.confidence * 100)}%</span>
            </div>
            )
          })}
          {!filteredLeaderboard.length && <div className="px-5 py-8 text-center text-sm text-white/42">No forecasts match the current filters.</div>}
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-semibold text-white/85 mb-4">Forecast Methods</h3>
          <div className="space-y-3">
            {filteredMethodData.map((method) => (
              <div key={method.method} className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{formatForecastMethod(method.method)}</p>
                  <span className="text-xs text-emerald-300">{Math.round(method.avg_confidence * 100)}%</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/40">{method.description}</p>
                <p className="mt-2 text-xs text-white/35">{method.count} skills</p>
              </div>
            ))}
            {!filteredMethodData.length && <p className="rounded-lg border border-white/5 bg-white/[0.03] p-4 text-sm text-white/42">No forecast methods are present in the current filter result.</p>}
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

function EmptyForecastState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid h-[280px] place-items-center rounded-xl border border-white/8 bg-white/[0.025] px-5 text-center">
      <div>
        <p className="text-sm font-semibold text-white/72">{title}</p>
        <p className="mt-2 text-xs text-white/38">{detail}</p>
      </div>
    </div>
  )
}

function ChartInterpretation({ children }: { children: ReactNode }) {
  return <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-relaxed text-white/48">{children}</div>
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
            {label === 'Method' ? formatForecastMethod(option) : option}
          </button>
        ))}
      </div>
    </div>
  )
}

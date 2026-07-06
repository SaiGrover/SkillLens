import { Component, useState, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Globe, TrendingUp } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { Suspense, lazy } from 'react'
import { globalApi, RegionData } from '@/services/api'

const SkillNetwork = lazy(() => import('@/components/three/SkillNetwork'))

const regionColors = ['#a78bfa','#d8b4fe','#34d399','#fb923c','#f472b6','#60a5fa','#f87171']

class NetworkBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Skill network switched to 2D fallback:', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface MappedRegion {
  region: string
  topSkill: string
  demand: number
  avgSalary: string
  growth: string
  rawGrowth: number
}

export default function Global() {
  const [regions, setRegions] = useState<MappedRegion[]>([])
  const [radarData, setRadarData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const topRegion = [...regions].sort((left, right) => right.demand - left.demand)[0]

  useEffect(() => {
    async function loadGlobalDemand() {
      try {
        setLoading(true)
        const res = await globalApi.all()
        const mapped = res.map((r: RegionData) => ({
          region: r.region,
          topSkill: r.top_skills?.[0] ?? 'N/A',
          demand: Math.round(r.demand_index),
          avgSalary: r.avg_salary_usd >= 1000 ? `$${Math.round(r.avg_salary_usd / 1000)}k` : `$${r.avg_salary_usd}`,
          growth: `+${Math.round(r.growth_index)}%`,
          rawGrowth: r.growth_index
        }))
        setRegions(mapped)
        
        // Build radar data dynamically
        const radar = mapped.slice(0, 5).map(r => ({
          region: r.region.split(' ')[0],
          demand: r.demand
        }))
        setRadarData(radar)
      } catch (err) {
        console.error("Error loading global demand:", err)
      } finally {
        setLoading(false)
      }
    }
    loadGlobalDemand()
  }, [])

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-white/50 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p>Loading global workforce map from real datasets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5"><Globe size={26} className="text-fuchsia-300" strokeWidth={1.75} /> Global Demand Analytics</h1>
        <p className="page-subtitle">Skill demand across major world regions</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 3D Globe */}
        <div className="glass rounded-xl border border-white/5 overflow-hidden" style={{ minHeight: 400 }}>
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white/80">Skill Network Visualization</h3>
          </div>
          <div className="h-[340px]">
            <NetworkBoundary fallback={<NetworkFallback regions={regions} />}>
              <Suspense fallback={<div className="h-full flex flex-col items-center justify-center gap-3 text-sm text-white/45"><span className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400/40 border-t-fuchsia-300" />3D network loading...</div>}>
                <SkillNetwork />
              </Suspense>
            </NetworkBoundary>
          </div>
          {topRegion && (
            <ChartInterpretation>
              Interpretation: this network is an exploratory view of regional skill demand. The strongest loaded regional signal is <b>{topRegion.region}</b> with <b>{topRegion.demand}</b>/100 demand, so use the visual for relative concentration rather than exact geographic market sizing.
            </ChartInterpretation>
          )}
        </div>

        {/* Radar */}
        <div className="glass rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Regional Demand Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="region" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <Radar name="Demand" dataKey="demand" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          {topRegion && (
            <ChartInterpretation>
              Interpretation: the radar compares the top loaded regions on the same demand scale. Longer spokes indicate stronger relative demand; the chart does not include salary or growth, which are shown on the regional cards below.
            </ChartInterpretation>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {regions.map(({ region, topSkill, demand, avgSalary, growth }, i) => (
          <motion.div key={region} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5 border border-white/5 hover:border-violet-500/20 card-hover">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{region}</h3>
              <span className="w-3 h-3 rounded-full" style={{ background: regionColors[i % regionColors.length] }} />
            </div>
            <p className="text-xs text-white/40 mb-1">Top Skill</p>
            <p className="text-sm font-medium mb-3" style={{ color: regionColors[i % regionColors.length] }}>{topSkill}</p>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-white/30 mb-1"><span>Demand</span><span>{demand}%</span></div>
                <div className="h-1 bg-white/10 rounded-full"><div className="h-1 rounded-full" style={{ width: `${demand}%`, background: regionColors[i % regionColors.length] }} /></div>
              </div>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
              <div><p className="text-xs text-white/30">Avg Salary</p><p className="text-xs font-semibold text-white">{avgSalary}</p></div>
              <div className="text-right"><p className="text-xs text-white/30">Growth</p><p className="text-xs font-semibold text-emerald-400">{growth}</p></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass rounded-xl p-5 border border-white/5">
        <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-fuchsia-400" /> Global Hot Skills</h3>
        <div className="grid md:grid-cols-4 gap-3">
          {[
            { skill: 'LLM Engineering', regions: 5, trend: '+78%', color: 'violet' },
            { skill: 'Cybersecurity', regions: 5, trend: '+31%', color: 'fuchsia' },
            { skill: 'Cloud (AWS/GCP)', regions: 5, trend: '+22%', color: 'emerald' },
            { skill: 'Data Science', regions: 4, trend: '+25%', color: 'amber' },
          ].map(({ skill, regions, trend, color }) => (
            <div key={skill} className={`p-4 rounded-lg bg-${color}-600/10 border border-${color}-500/20`}>
              <p className={`font-semibold text-${color}-300 text-sm`}>{skill}</p>
              <p className="text-xs text-white/30 mt-1">In demand across {regions}/5 regions</p>
              <p className="text-emerald-400 text-xs font-bold mt-2">{trend}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChartInterpretation({ children }: { children: ReactNode }) {
  return <div className="mx-4 mb-4 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-relaxed text-white/48">{children}</div>
}

function NetworkFallback({ regions }: { regions: MappedRegion[] }) {
  const top = [...regions].sort((left, right) => right.demand - left.demand).slice(0, 6)
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6 py-5">
      <div><p className="text-sm font-semibold text-white/80">2D demand network</p><p className="mt-1 text-xs text-white/40">WebGL is unavailable on this device, so this accessible fallback shows the same regional signals.</p></div>
      <div className="space-y-3">
        {top.map((region, index) => <div key={region.region} className="grid grid-cols-[88px_1fr_36px] items-center gap-3 text-xs"><span className="truncate text-white/60">{region.region}</span><div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: `${Math.min(100, region.demand)}%`, background: regionColors[index % regionColors.length] }} /></div><span className="text-right text-white/70">{region.demand}</span></div>)}
      </div>
    </div>
  )
}

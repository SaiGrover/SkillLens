import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Briefcase, Building2, Network, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { IndustrySkill, IndustrySummary, industriesApi } from '@/services/api'

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
  'Data Analytics': 'Analytics', 'Software Engineering': 'Software', 'Data Science': 'Data Sci.',
  'AI/ML': 'AI/ML', Cybersecurity: 'Cyber', 'Cloud & DevOps': 'Cloud',
  'Data Engineering': 'Data Eng.', 'Systems Engineering': 'Systems',
}
const archetypeColors: Record<string, string> = {
  'Future-Proof': '#2dd4bf', Growing: '#c084fc', Stable: '#a78bfa', 'High-Risk': '#f59e0b',
}
const trendColors: Record<string, string> = {
  Explosive: '#f472b6', Growing: '#34d399', Stable: '#a78bfa', Declining: '#fb923c',
}
const industryTrendColors: Record<string, string> = {
  'Strong Growth': '#34d399', Growing: '#c084fc', Steady: '#a78bfa', Stable: '#fbbf24', Contracting: '#fb923c',
}

function normalizeIndustry(industry: IndustrySummary): IndustryView {
  const avgSes = Math.round((industry.avg_ses ?? industry.hiring_index ?? 0.5) * ((industry.avg_ses ?? 0) <= 1 ? 100 : 1))
  const riskExposure = Math.round(industry.extinction_risk ?? Math.max(0, 100 - avgSes))
  return {
    ...industry,
    avgSes,
    riskExposure,
    growth: Math.round(industry.growth_rate ?? 0),
    hiring: Math.round(industry.hiring_index ?? 0),
    trend: industry.forecast ?? 'Stable',
    topSkill: industry.top_skills?.[0] ?? 'Unavailable',
    highRiskSkills: Math.round((industry.skill_count ?? 0) * riskExposure / 100),
  }
}

function riskLabel(value: number) {
  if (value >= 45) return 'High'
  if (value >= 24) return 'Medium'
  return 'Low'
}

export default function Industries() {
  const [searchParams] = useSearchParams()
  const [industries, setIndustries] = useState<IndustryView[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [industrySkills, setIndustrySkills] = useState<IndustrySkill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadIndustries() {
      try {
        setLoading(true)
        const mapped = (await industriesApi.list()).map(normalizeIndustry)
        setIndustries(mapped)
        const requested = searchParams.get('search')?.toLowerCase()
        const matched = requested ? mapped.find((item) => item.id === requested || item.name.toLowerCase().includes(requested)) : undefined
        setSelectedId(matched?.id ?? mapped[0]?.id ?? null)
      } finally {
        setLoading(false)
      }
    }
    loadIndustries()
  }, [searchParams])

  useEffect(() => {
    if (!selectedId) return
    industriesApi.skills(selectedId).then(setIndustrySkills).catch(() => setIndustrySkills([]))
  }, [selectedId])

  const selected = industries.find((item) => item.id === selectedId) ?? industries[0]
  const comparisonData = useMemo(() => industries.map((item) => ({
    name: shortLabels[item.name] ?? item.name,
    safety: item.avgSes,
    growth: item.growth,
    size: Math.max(1, item.skill_count ?? 1),
    trend: item.trend,
  })), [industries])
  const archetypeData = useMemo(() => {
    const source = selected?.archetype_distribution
    if (source) return Object.entries(source).map(([name, value]) => ({ name, value, color: archetypeColors[name] ?? '#64748b' })).filter((item) => item.value > 0)
    const counts = industrySkills.reduce<Record<string, number>>((result, skill) => {
      const key = skill.archetype ?? 'Stable'; result[key] = (result[key] ?? 0) + 1; return result
    }, {})
    return Object.entries(counts).map(([name, count]) => ({ name, value: Math.round(count / Math.max(1, industrySkills.length) * 100), color: archetypeColors[name] ?? '#64748b' }))
  }, [selected, industrySkills])
  const trendData = useMemo(() => {
    const counts = industrySkills.reduce<Record<string, number>>((result, skill) => {
      const key = skill.forecast_trend ?? 'Stable'; result[key] = (result[key] ?? 0) + 1; return result
    }, {})
    return Object.entries(counts).map(([name, value]) => ({ name, value, color: trendColors[name] ?? '#64748b' }))
  }, [industrySkills])
  const riskExposureData = useMemo(() => industries.map((industry) => {
    const archetypes = industry.archetype_distribution ?? {}
    return {
      industry: shortLabels[industry.name] ?? industry.name,
      Low: Math.round((archetypes['Future-Proof'] ?? 0) + (archetypes.Growing ?? 0)),
      Medium: Math.round(archetypes.Stable ?? 0),
      High: Math.round(archetypes['High-Risk'] ?? industry.riskExposure),
    }
  }), [industries])

  if (loading) return <div className="flex h-[60vh] items-center justify-center text-sm text-white/50">Loading industry analytics...</div>
  if (!selected) return <div className="py-20 text-center text-white/35">No industry data available.</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5"><Building2 size={26} className="text-emerald-300" strokeWidth={1.75} /> Industry Intelligence</h1>
          <p className="page-subtitle">Compare skill safety, forecast movement, and demand signals by workforce domain.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55">Canonical HSEP snapshot</span>
      </header>

      <section className="industry-selector glass">
        {industries.map((industry) => (
          <button key={industry.id} onClick={() => setSelectedId(industry.id)} className={industry.id === selected.id ? 'active' : ''}>
            <span>{industry.name}</span><small>{industry.skill_count} skills</small>
          </button>
        ))}
      </section>

      <section className="industry-overview glass">
        <div>
          <p className="section-label">Selected industry</p>
          <h2 className="section-title mt-1">{selected.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">{selected.skill_count} mapped skills, led by {selected.topSkill}. The trend label is based on the average three-year forecast movement across the mapped skills.</p>
        </div>
        <span className={`industry-trend ${selected.trend.toLowerCase().replace(/\s+/g, '-')}`}>{selected.trend}</span>
        <div className="industry-kpis">
          <Metric icon={Sparkles} label="Average SES" value={`${selected.avgSes} / 100`} detail="safety index" />
          <Metric icon={Briefcase} label="Demand Index" value={`${selected.hiring} / 100`} detail="mean LinkedIn signal" />
          <Metric icon={TrendingUp} label="3Y Forecast" value={`${selected.growth >= 0 ? '+' : ''}${selected.growth}%`} detail="average demand movement" />
          <Metric icon={ShieldAlert} label="Risk Exposure" value={riskLabel(selected.riskExposure)} detail={`${selected.highRiskSkills} mapped skills`} />
        </div>
      </section>

      <div className="industry-visual-grid">
        <section className="glass industry-network-card">
          <div className="industry-card-heading"><div><p className="section-label">Skill map</p><h3>Industry skill network</h3></div><span><Network size={15} /> Node size: demand</span></div>
          <IndustryNetwork industry={selected.name} skills={industrySkills} />
        </section>
        <section className="glass industry-distribution-card">
          <p className="section-label">Composition</p><h3>Archetype mix</h3>
          <div className="industry-donut-row">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart><Pie data={archetypeData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={67} paddingAngle={3}>{archetypeData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
            </ResponsiveContainer>
            <div className="industry-legend">{archetypeData.map((item) => <LegendRow key={item.name} color={item.color} label={item.name} value={`${item.value}%`} />)}</div>
          </div>
          <p className="mt-5 section-label">Forecast trend mix</p>
          <div className="industry-trend-list">{trendData.map((item) => <LegendRow key={item.name} color={item.color} label={item.name} value={`${item.value}`} />)}</div>
        </section>
      </div>

      <div className="industry-bottom-grid">
        <section className="glass p-5">
          <div className="industry-card-heading"><div><p className="section-label">Positioning</p><h3>Safety, growth, and coverage</h3></div><span>Bubble size: skills mapped</span></div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 18, right: 22, bottom: 12, left: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" />
              <XAxis type="number" dataKey="safety" name="Average SES" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Average SES', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
              <YAxis type="number" dataKey="growth" name="3Y forecast growth" unit="%" domain={[0, 15]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} label={{ value: '3Y growth', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
              <ZAxis type="number" dataKey="size" name="Mapped skills" range={[100, 520]} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.25)' }} formatter={(value: number, name: string) => name === '3Y forecast growth' ? [`${value}%`, name] : [value, name]} />
              <Scatter name="Industry" data={comparisonData}>{comparisonData.map((item) => <Cell key={item.name} fill={industryTrendColors[item.trend] ?? '#64748b'} />)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </section>
        <section className="glass p-5">
          <div className="industry-card-heading"><div><p className="section-label">Mapped skills</p><h3>Strongest safety signals</h3></div><span>{industrySkills.length} skills</span></div>
          <div className="industry-skill-list">{[...industrySkills].sort((a, b) => (b.ses_score ?? 0) - (a.ses_score ?? 0)).slice(0, 7).map((skill) => <div key={skill.id}><span className="dot" style={{ background: archetypeColors[skill.archetype ?? 'Stable'] ?? '#64748b' }} /><b>{skill.name}</b><small>{Math.round((skill.ses_score ?? 0) * 100)} SES</small><em>{skill.forecast_trend}</em></div>)}</div>
        </section>
      </div>

      <section className="glass p-5">
        <div className="industry-card-heading"><div><p className="section-label">Cross-industry comparison</p><h3>Risk exposure by industry</h3></div><span>Low / medium / high-risk skill mix</span></div>
        <ResponsiveContainer width="100%" height={Math.max(260, riskExposureData.length * 38)}>
          <BarChart data={riskExposureData} layout="vertical" margin={{ top: 10, right: 18, bottom: 10, left: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="industry" width={72} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="Low" stackId="risk" fill="#2dd4bf" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Medium" stackId="risk" fill="#fbbf24" />
            <Bar dataKey="High" stackId="risk" fill="#fb7185" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-400" />Low risk</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Medium risk</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />High risk</span></div>
      </section>
    </div>
  )
}

const tooltipStyle = { background: '#10071d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }

function Metric({ icon: Icon, label, value, detail }: { icon: React.ElementType; label: string; value: string | number; detail: string }) {
  return <div><Icon size={15} /><span>{label}</span><b>{value}</b><small>{detail}</small></div>
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return <div><i style={{ background: color }} /><span>{label}</span><b>{value}</b></div>
}

function IndustryNetwork({ industry, skills }: { industry: string; skills: IndustrySkill[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const center = { x: 250, y: 160 }
  const nodes = useMemo(() => skills.map((skill, index) => {
    const ring = index < 9 ? 100 : 135
    const position = index < 9 ? index : index - 9
    const count = index < 9 ? Math.min(9, skills.length) : Math.max(1, skills.length - 9)
    const angle = -Math.PI / 2 + (position / count) * Math.PI * 2
    const demand = Math.max(0, Math.min(100, (skill.linkedin_demand ?? 0) * 100))
    return { ...skill, x: center.x + Math.cos(angle) * ring, y: center.y + Math.sin(angle) * ring, radius: 8 + Math.sqrt(demand) * 0.7, demand }
  }), [skills])
  const active = nodes.find((node) => node.id === hovered)
  return (
    <div className="industry-network-wrap">
      <svg viewBox="0 0 500 320" role="img" aria-label={`${industry} skill network`}>
        <defs><radialGradient id="networkCore"><stop stopColor="#d8b4fe" stopOpacity=".36" /><stop offset="1" stopColor="#d8b4fe" stopOpacity="0" /></radialGradient></defs>
        <circle cx={center.x} cy={center.y} r="62" fill="url(#networkCore)" />
        {nodes.map((node) => <line key={`line-${node.id}`} x1={center.x} y1={center.y} x2={node.x} y2={node.y} stroke={archetypeColors[node.archetype ?? 'Stable'] ?? '#64748b'} strokeOpacity={hovered && hovered !== node.id ? .12 : .38} strokeWidth={hovered === node.id ? 2 : 1} />)}
        <circle cx={center.x} cy={center.y} r="33" fill="#1b0d32" stroke="#e9d5ff" strokeWidth="1.5" />
        <text x={center.x} y={center.y - 3} textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">{industry}</text>
        <text x={center.x} y={center.y + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">{skills.length} skills</text>
        {nodes.map((node) => <g key={node.id} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} className="industry-network-node"><circle cx={node.x} cy={node.y} r={node.radius + 4} fill="transparent" /><circle cx={node.x} cy={node.y} r={node.radius} fill={archetypeColors[node.archetype ?? 'Stable'] ?? '#64748b'} fillOpacity={hovered && hovered !== node.id ? .34 : .9} stroke="#f8fafc" strokeOpacity=".35" /><text x={node.x} y={node.y + 3} textAnchor="middle" fill="#10071d" fontSize={Math.max(7, Math.min(11, node.radius))} fontWeight="700">{node.name.slice(0, 2).toUpperCase()}</text></g>)}
      </svg>
      <div className="industry-network-caption">{active ? <><b>{active.name}</b><span>Demand {Math.round(active.demand)} / 100 Â· SES {Math.round((active.ses_score ?? 0) * 100)} Â· {active.forecast_trend}</span></> : <span>Hover a skill node to inspect its HSEP signals.</span>}</div>
    </div>
  )
}

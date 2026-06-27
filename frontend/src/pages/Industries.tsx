import { useEffect, useMemo, useState, type ElementType } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { Briefcase, Building2, Network, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'
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
  'Data Analytics': 'Analytics',
  'Software Engineering': 'Software',
  'Data Science': 'Data Sci.',
  'AI/ML': 'AI/ML',
  Cybersecurity: 'Cyber',
  'Cloud & DevOps': 'Cloud',
  'Data Engineering': 'Data Eng.',
  'Systems Engineering': 'Systems',
}

const archetypeColors: Record<string, string> = {
  'Future-Proof': '#2dd4bf',
  Growing: '#c084fc',
  Stable: '#a78bfa',
  'High-Risk': '#f59e0b',
}

const trendColors: Record<string, string> = {
  Explosive: '#f472b6',
  Growing: '#34d399',
  Stable: '#a78bfa',
  Declining: '#fb923c',
}

const industryTrendColors: Record<string, string> = {
  'Strong Growth': '#34d399',
  Growing: '#c084fc',
  Steady: '#a78bfa',
  Stable: '#fbbf24',
  Contracting: '#fb923c',
}

function toPercent(value = 0) {
  return Math.round(value * (value <= 1 ? 100 : 1))
}

function normalizeIndustry(industry: IndustrySummary): IndustryView {
  const avgSes = toPercent(industry.avg_ses ?? industry.hiring_index ?? 0.5)
  const riskExposure = Math.round(industry.extinction_risk ?? Math.max(0, 100 - avgSes))

  return {
    ...industry,
    avgSes,
    riskExposure,
    growth: Math.round(industry.growth_rate ?? 0),
    hiring: toPercent(industry.hiring_index ?? 0),
    trend: industry.forecast ?? 'Stable',
    topSkill: industry.top_skills?.[0] ?? 'Unavailable',
    highRiskSkills: Math.round(((industry.skill_count ?? 0) * riskExposure) / 100),
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
        const requested = searchParams.get('search')?.toLowerCase()
        const matched = requested
          ? mapped.find((item) => item.id === requested || item.name.toLowerCase().includes(requested))
          : undefined

        setIndustries(mapped)
        setSelectedId(matched?.id ?? mapped[0]?.id ?? null)
      } catch (error) {
        console.error('Error loading industry analytics:', error)
        setIndustries([])
        setSelectedId(null)
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
    if (source) {
      return Object.entries(source)
        .map(([name, value]) => ({ name, value, color: archetypeColors[name] ?? '#64748b' }))
        .filter((item) => item.value > 0)
    }

    const counts = industrySkills.reduce<Record<string, number>>((result, skill) => {
      const key = skill.archetype ?? 'Stable'
      result[key] = (result[key] ?? 0) + 1
      return result
    }, {})

    return Object.entries(counts).map(([name, count]) => ({
      name,
      value: Math.round((count / Math.max(1, industrySkills.length)) * 100),
      color: archetypeColors[name] ?? '#64748b',
    }))
  }, [selected, industrySkills])

  const trendData = useMemo(() => {
    const counts = industrySkills.reduce<Record<string, number>>((result, skill) => {
      const key = skill.forecast_trend ?? 'Stable'
      result[key] = (result[key] ?? 0) + 1
      return result
    }, {})

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: trendColors[name] ?? '#64748b',
    }))
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
          <h1 className="page-title flex items-center gap-2.5">
            <Building2 size={26} className="text-fuchsia-300" strokeWidth={1.75} /> Industry Intelligence
          </h1>
          <p className="page-subtitle">Compare skill safety, forecast movement, and demand signals by workforce domain.</p>
        </div>
        <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-1.5 text-xs text-fuchsia-100/70">Canonical HSEP snapshot</span>
      </header>

      <section className="industry-selector glass">
        {industries.map((industry) => (
          <button key={industry.id} onClick={() => setSelectedId(industry.id)} className={industry.id === selected.id ? 'active' : ''}>
            <span>{industry.name}</span>
            <small>{industry.skill_count} skills</small>
          </button>
        ))}
      </section>

      <section className="industry-overview glass">
        <div>
          <p className="section-label">Selected industry</p>
          <h2 className="section-title mt-1">{selected.name}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            {selected.skill_count} mapped skills, led by {selected.topSkill}. The trend label is based on the average three-year forecast movement across the mapped skills.
          </p>
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
          <div className="industry-card-heading">
            <div>
              <p className="section-label">Skill map</p>
              <h3>Demand-weighted skill network</h3>
            </div>
            <span><Network size={15} /> Size: demand - Color: archetype</span>
          </div>
          <IndustryNetwork industry={selected.name} skills={industrySkills} />
        </section>

        <section className="glass industry-distribution-card">
          <p className="section-label">Composition</p>
          <h3>Archetype mix</h3>
          <div className="industry-donut-row">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={archetypeData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={67} paddingAngle={3}>
                  {archetypeData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="industry-legend">
              {archetypeData.map((item) => <LegendRow key={item.name} color={item.color} label={item.name} value={`${item.value}%`} />)}
            </div>
          </div>
          <p className="mt-5 section-label">Forecast trend mix</p>
          <div className="industry-trend-list">
            {trendData.map((item) => <LegendRow key={item.name} color={item.color} label={item.name} value={`${item.value}`} />)}
          </div>
        </section>
      </div>

      <div className="industry-bottom-grid">
        <section className="glass p-5">
          <div className="industry-card-heading">
            <div>
              <p className="section-label">Positioning</p>
              <h3>Safety, growth, and coverage</h3>
            </div>
            <span>Bubble size: skills mapped</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 18, right: 22, bottom: 12, left: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.055)" />
              <XAxis
                type="number"
                dataKey="safety"
                name="Average SES"
                domain={[0, 100]}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Average SES', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
              />
              <YAxis
                type="number"
                dataKey="growth"
                name="3Y forecast growth"
                unit="%"
                domain={[0, 15]}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
                label={{ value: '3Y growth', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.55)', fontSize: 10 }}
              />
              <ZAxis type="number" dataKey="size" name="Mapped skills" range={[100, 520]} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.25)' }}
                formatter={(value: number, name: string) => (name === '3Y forecast growth' ? [`${value}%`, name] : [value, name])}
              />
              <Scatter name="Industry" data={comparisonData}>
                {comparisonData.map((item) => <Cell key={item.name} fill={industryTrendColors[item.trend] ?? '#64748b'} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </section>

        <section className="glass p-5">
          <div className="industry-card-heading">
            <div>
              <p className="section-label">Mapped skills</p>
              <h3>Strongest safety signals</h3>
            </div>
            <span>{industrySkills.length} skills</span>
          </div>
          <div className="industry-skill-list">
            {[...industrySkills]
              .sort((a, b) => (b.ses_score ?? 0) - (a.ses_score ?? 0))
              .slice(0, 7)
              .map((skill) => (
                <div key={skill.id}>
                  <span className="dot" style={{ background: archetypeColors[skill.archetype ?? 'Stable'] ?? '#64748b' }} />
                  <b>{skill.name}</b>
                  <small>{Math.round((skill.ses_score ?? 0) * 100)} SES</small>
                  <em>{skill.forecast_trend ?? 'Stable'}</em>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className="glass p-5">
        <div className="industry-card-heading">
          <div>
            <p className="section-label">Cross-industry comparison</p>
            <h3>Risk exposure by industry</h3>
          </div>
          <span>Low / medium / high-risk skill mix</span>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(260, riskExposureData.length * 38)}>
          <BarChart data={riskExposureData} layout="vertical" margin={{ top: 10, right: 18, bottom: 10, left: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="industry" width={72} tick={{ fill: 'rgba(255,255,255,0.58)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="Low" stackId="risk" fill="#2dd4bf" />
            <Bar dataKey="Medium" stackId="risk" fill="#fbbf24" />
            <Bar dataKey="High" stackId="risk" fill="#fb7185" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-400" />Low risk</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Medium risk</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />High risk</span>
        </div>
      </section>
    </div>
  )
}

const tooltipStyle = { background: '#10071d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }

function Metric({ icon: Icon, label, value, detail }: { icon: ElementType; label: string; value: string | number; detail: string }) {
  return (
    <div>
      <Icon size={15} />
      <span>{label}</span>
      <b>{value}</b>
      <small>{detail}</small>
    </div>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div>
      <i style={{ background: color }} />
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function IndustryNetwork({ industry, skills }: { industry: string; skills: IndustrySkill[] }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const center = { x: 380, y: 190 }
  const nodes = useMemo(() => [...skills]
    .sort((a, b) => ((b.linkedin_demand ?? 0) + (b.ses_score ?? 0)) - ((a.linkedin_demand ?? 0) + (a.ses_score ?? 0)))
    .slice(0, 16)
    .map((skill, index) => {
      const ring = index < 6 ? 118 : 178
      const position = index < 6 ? index : index - 6
      const count = index < 6 ? Math.min(6, skills.length) : Math.max(1, Math.min(10, skills.length - 6))
      const angle = -Math.PI / 2 + (position / count) * Math.PI * 2 + (index >= 6 ? Math.PI / 10 : 0)
      const demand = Math.max(0, Math.min(100, (skill.linkedin_demand ?? 0) * 100))
      const safety = Math.round((skill.ses_score ?? 0) * 100)

      return {
        ...skill,
        key: `${skill.id}-${skill.name}-${index}`,
        x: center.x + Math.cos(angle) * ring,
        y: center.y + Math.sin(angle) * ring,
        radius: 16 + Math.sqrt(Math.max(8, demand)) * 1.75,
        demand,
        safety,
        shortName: skill.name.length > 13 ? `${skill.name.slice(0, 12)}...` : skill.name,
      }
    }), [skills])
  const active = nodes.find((node) => node.id === hovered)
  const topNodes = nodes.slice(0, 4)

  return (
    <div className="industry-network-wrap">
      <svg viewBox="0 0 760 390" role="img" aria-label={`${industry} skill network`}>
        <defs>
          <radialGradient id="networkCorePolished" cx="50%" cy="50%" r="50%">
            <stop stopColor="#f0abfc" stopOpacity=".42" />
            <stop offset=".52" stopColor="#a855f7" stopOpacity=".14" />
            <stop offset="1" stopColor="#10071d" stopOpacity="0" />
          </radialGradient>
          <filter id="nodeGlowPolished" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="networkGridPolished" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,.045)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="760" height="390" rx="22" fill="url(#networkGridPolished)" opacity=".7" />
        <circle cx={center.x} cy={center.y} r="158" fill="url(#networkCorePolished)" />
        <circle cx={center.x} cy={center.y} r="118" fill="none" stroke="rgba(240,171,252,.14)" strokeDasharray="5 9" />
        <circle cx={center.x} cy={center.y} r="178" fill="none" stroke="rgba(216,180,254,.09)" strokeDasharray="4 12" />
        {nodes.map((node, index) => (
          <line
            key={`line-${node.key}`}
            x1={center.x}
            y1={center.y}
            x2={node.x}
            y2={node.y}
            stroke={archetypeColors[node.archetype ?? 'Stable'] ?? '#a78bfa'}
            strokeOpacity={hovered && hovered !== node.id ? .1 : index < 6 ? .42 : .24}
            strokeWidth={hovered === node.id ? 2.6 : index < 6 ? 1.35 : 0.9}
          />
        ))}
        <g filter="url(#nodeGlowPolished)">
          <circle cx={center.x} cy={center.y} r="56" fill="rgba(27,13,50,.96)" stroke="#f0abfc" strokeWidth="1.6" />
          <text x={center.x} y={center.y - 7} textAnchor="middle" fill="#fff7ff" fontSize="16" fontWeight="800">{industry}</text>
          <text x={center.x} y={center.y + 13} textAnchor="middle" fill="#d8b4fe" fontSize="11">{skills.length} mapped skills</text>
        </g>
        {nodes.map((node) => {
          const color = archetypeColors[node.archetype ?? 'Stable'] ?? '#a78bfa'
          const isActive = hovered === node.id
          const isDimmed = hovered && !isActive
          return (
            <g
              key={node.key}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              className="industry-network-node"
              opacity={isDimmed ? .38 : 1}
            >
              <circle cx={node.x} cy={node.y} r={node.radius + 12} fill="transparent" />
              <circle cx={node.x} cy={node.y} r={node.radius + 5} fill={color} opacity={isActive ? .24 : .1} />
              <circle cx={node.x} cy={node.y} r={node.radius} fill={color} fillOpacity={isActive ? .98 : .82} stroke="#fff7ff" strokeOpacity={isActive ? .82 : .28} strokeWidth={isActive ? 2 : 1} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#12051f" fontSize={Math.max(9, Math.min(14, node.radius * 0.54))} fontWeight="900">{node.name.slice(0, 2).toUpperCase()}</text>
              <text x={node.x} y={node.y + node.radius + 17} textAnchor="middle" fill="#f8eaff" fontSize="10.5" fontWeight="700">{node.shortName}</text>
              <text x={node.x} y={node.y + node.radius + 31} textAnchor="middle" fill="rgba(248,234,255,.48)" fontSize="9">D {Math.round(node.demand)} - SES {node.safety}</text>
            </g>
          )
        })}
      </svg>
      <div className="industry-network-caption">
        {active ? (
          <>
            <b>{active.name}</b>
            <span>Demand {Math.round(active.demand)} / 100 - SES {active.safety} - {active.archetype ?? 'Tracked'} - {active.forecast_trend ?? 'Stable'}</span>
          </>
        ) : (
          <>
            <span>Top nodes:</span>
            {topNodes.map((node) => <b key={node.key}>{node.name}</b>)}
          </>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

interface ChartSeries {
  key: string
  name: string
  color: string
}

interface DemandChartProps {
  data: any[]
  title?: string
  series?: ChartSeries[]
}

const defaultSeries: ChartSeries[] = [
  { key: 'artificial-intelligence', name: 'Artificial Intelligence', color: '#f0abfc' },
  { key: 'machine-learning', name: 'Machine Learning', color: '#c084fc' },
  { key: 'natural-language-processing', name: 'NLP', color: '#a78bfa' },
  { key: 'power-bi', name: 'Power BI', color: '#f472b6' },
  { key: 'python', name: 'Python', color: '#e879f9' },
  { key: 'javascript', name: 'JavaScript', color: '#fde047' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg p-3 border border-white/10">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value} demand index
        </p>
      ))}
    </div>
  )
}

export default function DemandChart({ data, title, series = defaultSeries }: DemandChartProps) {
  const [visibleSeries, setVisibleSeries] = useState(() => new Set(series.map((item) => item.key)))

  const toggleSeries = (key: string) => {
    setVisibleSeries((current) => {
      const next = new Set(current)
      if (next.has(key) && next.size > 1) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="glass rounded-xl p-5 border border-white/5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title && <h3 className="text-sm font-semibold text-white/80">{title}</h3>}
          <p className="mt-1 text-xs text-white/35">Shared log-scaled demand index across selected skills. 100 marks the strongest observed or projected signal in this chart, not 100% demand or market share.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {series.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSeries(item.key)}
              aria-pressed={visibleSeries.has(item.key)}
              className={`rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${visibleSeries.has(item.key) ? 'border-white/20 bg-white/[0.09] text-white' : 'border-white/8 bg-transparent text-white/35'}`}
            >
              <i className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />{item.name}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 18, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Year', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.38)', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Relative demand index', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.38)', fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
          <ReferenceLine x="2026" stroke="rgba(255,255,255,0.34)" strokeDasharray="4 4" label={{ value: 'Projection', fill: 'rgba(255,255,255,0.46)', fontSize: 10 }} />
          {series.filter((item) => visibleSeries.has(item.key)).map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={2}
              dot={false}
              name={item.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

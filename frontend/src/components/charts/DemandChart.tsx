import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  { key: 'python', name: 'Python', color: '#a78bfa' },
  { key: 'javascript', name: 'JavaScript', color: '#38bdf8' },
  { key: 'kubernetes', name: 'Kubernetes', color: '#34d399' },
  { key: 'react', name: 'React', color: '#fb923c' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg p-3 border border-white/10">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  )
}

export default function DemandChart({ data, title, series = defaultSeries }: DemandChartProps) {
  return (
    <div className="glass rounded-xl p-5 border border-white/5">
      {title && <h3 className="text-sm font-semibold text-white/80 mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
          {series.map((item) => (
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

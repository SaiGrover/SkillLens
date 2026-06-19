import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface SalarySeries {
  key: string
  name: string
  color: string
}

const defaultSeries: SalarySeries[] = [
  { key: 'python', name: 'Python', color: '#34d399' },
  { key: 'javascript', name: 'JavaScript', color: '#38bdf8' },
  { key: 'kubernetes', name: 'Kubernetes', color: '#a78bfa' },
  { key: 'react', name: 'React', color: '#fb923c' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg p-3 border border-white/10">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: ${p.value}k
        </p>
      ))}
    </div>
  )
}

export default function SalaryChart({ data, series = defaultSeries }: { data: any[]; series?: SalarySeries[] }) {
  return (
    <div className="glass rounded-xl p-5 border border-white/5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Salary Trends (USD thousands)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            {series.map((item) => (
              <linearGradient key={item.key} id={`${item.key}Grad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={item.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={item.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {series.map((item, index) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              fill={index === 0 ? `url(#${item.key}Grad)` : 'none'}
              strokeWidth={2}
              name={item.name}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

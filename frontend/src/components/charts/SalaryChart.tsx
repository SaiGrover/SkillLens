import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-lg border border-white/10 p-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-sm font-medium text-fuchsia-200">{payload[0].value} / 100 salary value index</p>
    </div>
  )
}

export default function SalaryChart({ data }: { data: { skill: string; premium: number }[] }) {
  return (
    <div className="glass rounded-xl border border-white/5 p-5">
      <h3 className="text-sm font-semibold text-white/80">Salary Value Signals</h3>
      <p className="mb-4 mt-1 text-xs text-white/35">Normalized compensation feature from the processed dataset, not an estimated salary or percentage premium.</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="skill" tick={{ fill: 'rgba(255,255,255,0.38)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="premium" name="Salary value index" fill="#a78bfa" radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

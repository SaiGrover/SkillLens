import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillCardProps {
  id: string; name: string; category: string; demand: number; futureDemand: number; growth: number; risk: number; salary: number
  sesScore?: number; sesTier?: string; archetype?: string; forecastTrend?: string
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, value))
}

export default function SkillCard({
  id, name, category, demand, futureDemand, growth, risk, salary,
  sesScore, sesTier, archetype, forecastTrend
}: SkillCardProps) {
  const navigate = useNavigate()
  const isGrowing = growth > 0

  return (
    <div
      onClick={() => navigate(`/skills/${id}`)}
      className="glass rounded-xl p-5 cursor-pointer card-hover border border-white/5 hover:border-violet-500/30"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{name}</h3>
          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{category}</span>
        </div>
        <div className={cn('flex items-center gap-1 text-sm font-medium', isGrowing ? 'text-emerald-400' : 'text-red-400')}>
          {isGrowing ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {growth > 0 ? '+' : ''}{growth}%
        </div>
      </div>
      <div className="space-y-2.5">
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Current Demand</span><span>{demand}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full">
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" style={{ width: `${clampPct(demand)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Future Demand</span><span>{futureDemand}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full" style={{ width: `${clampPct(futureDemand)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <span className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/45">
            SES <b className="font-semibold text-white/80">{sesScore ?? 'N/A'}</b>
          </span>
          <span className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/45">
            Tier <b className="font-semibold text-white/80">{sesTier ?? 'N/A'}</b>
          </span>
          <span className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/45">
            Trend <b className="font-semibold capitalize text-white/80">{forecastTrend ?? 'N/A'}</b>
          </span>
          <span className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/45">
            Type <b className="font-semibold text-white/80">{archetype ?? 'N/A'}</b>
          </span>
        </div>
      </div>
      <div className="flex justify-between mt-4 pt-4 border-t border-white/5">
        <div className="text-center">
          <p className="text-xs text-white/30">Salary</p>
          <p className="text-sm font-semibold text-white">${(salary/1000).toFixed(0)}k</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/30">Risk</p>
          <p className={cn('text-sm font-semibold flex items-center gap-1', risk > 20 ? 'text-red-400' : risk > 10 ? 'text-yellow-400' : 'text-emerald-400')}>
            {risk > 20 && <AlertTriangle size={12} />}{risk}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-white/30">Future</p>
          <p className="text-sm font-semibold text-cyan-400">{futureDemand}%</p>
        </div>
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  positive?: boolean
  icon?: React.ReactNode
  color?: 'violet' | 'fuchsia' | 'emerald' | 'amber' | 'red'
}

const colorMap = {
  violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
  fuchsia: 'from-fuchsia-600/20 to-fuchsia-600/5 border-fuchsia-500/20',
  emerald: 'from-purple-600/20 to-violet-600/5 border-purple-500/20',
  amber: 'from-fuchsia-600/20 to-violet-600/5 border-fuchsia-500/20',
  red: 'from-red-600/20 to-red-600/5 border-red-500/20',
}

const textMap = {
  violet: 'text-violet-300', fuchsia: 'text-fuchsia-300', emerald: 'text-purple-300', amber: 'text-fuchsia-200', red: 'text-red-300',
}

export default function StatCard({ label, value, change, positive, icon, color = 'violet' }: StatCardProps) {
  return (
    <div className={cn('rounded-xl p-5 border bg-gradient-to-br card-hover', colorMap[color])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider mb-1.5 text-[var(--text-subtle)]">{label}</p>
          <p className={cn('text-[2rem] font-semibold leading-none tracking-tight', textMap[color])}>{value}</p>
          {change && (
            <p className={cn('text-xs mt-1', positive ? 'text-fuchsia-300' : 'text-red-300')}>
              {positive ? '+' : '-'} {change}
            </p>
          )}
        </div>
        {icon && <div className={cn('opacity-60', textMap[color])}>{icon}</div>}
      </div>
    </div>
  )
}

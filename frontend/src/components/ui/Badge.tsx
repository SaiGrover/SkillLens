import { cn } from '@/lib/utils'

interface BadgeProps { label: string; color?: 'violet' | 'fuchsia' | 'emerald' | 'amber' | 'red'; className?: string }

const colorMap = {
  violet: 'bg-violet-600/15 border-violet-500/25 text-violet-300',
  fuchsia: 'bg-fuchsia-600/15 border-fuchsia-500/25 text-fuchsia-300',
  emerald: 'bg-emerald-600/15 border-emerald-500/25 text-emerald-300',
  amber: 'bg-amber-600/15 border-amber-500/25 text-amber-300',
  red: 'bg-red-600/15 border-red-500/25 text-red-300',
}

export default function Badge({ label, color = 'violet', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', colorMap[color], className)}>
      {label}
    </span>
  )
}

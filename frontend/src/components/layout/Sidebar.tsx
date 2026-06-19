import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, LineChart, Building2, Bot,
  Map, FileText, FlaskConical, TrendingUp, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { csvSnapshotMetadata } from '@/data/fallbackData'

const nav = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/skills-guide', icon: BookOpen, label: 'Skills Guide' },
    ],
  },
  {
    section: 'Explore',
    items: [
      { to: '/skills', icon: Search, label: 'Skill Explorer' },
      { to: '/forecasts', icon: LineChart, label: 'Forecasts' },
      { to: '/industries', icon: Building2, label: 'Industries' },
    ],
  },
  {
    section: 'AI Tools',
    items: [
      { to: '/advisor', icon: Bot, label: 'Career Advisor' },
      { to: '/roadmaps', icon: Map, label: 'Roadmaps' },
    ],
  },
  {
    section: 'Output',
    items: [
      { to: '/reports', icon: FileText, label: 'Reports' },
      { to: '/methodology', icon: FlaskConical, label: 'Methodology' },
    ],
  },
]

export default function Sidebar() {
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const refreshSavedCount = () => {
      try {
        const saved = JSON.parse(window.localStorage.getItem('skilllens:saved-skills') ?? '[]')
        setSavedCount(Array.isArray(saved) ? saved.length : 0)
      } catch {
        setSavedCount(0)
      }
    }
    refreshSavedCount()
    window.addEventListener('skilllens:saved-skills', refreshSavedCount)
    return () => window.removeEventListener('skilllens:saved-skills', refreshSavedCount)
  }, [])

  return (
    <aside className="relative z-10 shrink-0 border-r border-white/10 bg-[#050815]/70 backdrop-blur-xl flex flex-col" style={{ width: 208 }}>
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-[15px] tracking-wide">SkillLens AI</p>
            <p className="text-[11px] text-[var(--text-subtle)] uppercase tracking-widest">Workforce Intel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-3 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-subtle)]">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-violet-600/20 text-violet-100 border border-violet-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="glass rounded-lg p-2.5">
          <p className="text-xs text-[var(--text-muted)] mb-1">Processed CSV Snapshot</p>
          <p className="text-xl font-semibold text-emerald-300">{csvSnapshotMetadata.skill_count} skills</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-subtle)]">
            {csvSnapshotMetadata.history_records.toLocaleString()} history rows available offline.
          </p>
          <p className="mt-2 text-[11px] text-violet-200/75">Saved skills: {savedCount}</p>
          <div className="h-1 bg-white/10 rounded-full mt-3">
            <div
              className="h-1 bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full"
              style={{ width: '86%' }}
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

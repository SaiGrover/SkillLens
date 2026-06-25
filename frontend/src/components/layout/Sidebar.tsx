import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, LineChart, Building2, Bot,
  Target, FileText, FlaskConical, TrendingUp, BookOpen
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
      { to: '/recommender', icon: Target, label: 'Skill Recommender' },
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
    <aside className="top-orbit-panel relative z-20 shrink-0 border-b border-white/10 px-3 py-3 md:px-5">
      <div className="mx-auto flex max-w-[1760px] flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="brand-prism flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
              <TrendingUp size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="top-brand-title truncate">SkillLens AI</p>
              <p className="top-brand-subtitle truncate">Human skill extinction predictor</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <span className="top-mini-chip">{csvSnapshotMetadata.skill_count} signals</span>
            <span className="top-mini-chip top-mini-chip--warm">{savedCount} saved</span>
          </div>
        </div>

        <nav className="top-nav-scroll min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max items-stretch gap-2 pb-1 xl:justify-center xl:pb-0">
            {nav.map((group) => (
              <div key={group.section} className="top-nav-group">
                <span className="top-nav-section">{group.section}</span>
                <div className="flex items-center gap-1.5">
                  {group.items.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) => cn(
                        'top-nav-link',
                        isActive && 'top-nav-link--active'
                      )}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          <div className="top-status-card">
            <span>Dataset</span>
            <b>{csvSnapshotMetadata.skill_count} skill signals</b>
          </div>
          <div className="top-status-card top-status-card--saved">
            <span>Saved</span>
            <b>{savedCount}</b>
          </div>
        </div>
      </div>
    </aside>
  )
}

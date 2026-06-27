import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, LineChart, Building2, Bot,
  Target, FileText, FlaskConical, TrendingUp, BookOpen, ChevronRight, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
      { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
      { to: '/methodology', icon: FlaskConical, label: 'Methodology' },
    ],
  },
]

export default function Sidebar() {
  const navRef = useRef<HTMLElement | null>(null)

  const scrollNavRight = () => {
    const navEl = navRef.current
    if (!navEl) return

    const remaining = navEl.scrollWidth - navEl.clientWidth - navEl.scrollLeft
    navEl.scrollTo({
      left: remaining < 48 ? 0 : navEl.scrollLeft + Math.min(420, navEl.clientWidth * 0.72),
      behavior: 'smooth',
    })
  }

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
            <button type="button" className="top-scroll-cue" onClick={scrollNavRight} aria-label="Scroll navigation to the right">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <nav ref={navRef} className="top-nav-scroll min-w-0 flex-1 overflow-x-auto" aria-label="Primary">
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
          <button type="button" className="top-scroll-cue" onClick={scrollNavRight} aria-label="Scroll navigation to the right">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </aside>
  )
}

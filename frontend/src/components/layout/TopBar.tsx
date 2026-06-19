import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { csvSnapshotMetadata } from '@/data/fallbackData'
import { industriesApi, skillsApi } from '@/services/api'

const pageSearch: Record<string, string> = {
  '/dashboard': 'Search skills, industries, KPIs...',
  '/skills-guide': 'Search the skill guide...',
  '/forecasts': 'Search skills, trends, forecast methods...',
  '/industries': 'Search industries, sectors, skills...',
  '/roadmaps': 'Search career goals, skills, roles...',
  '/reports': 'Search reports, exports, skill summaries...',
  '/methodology': 'Search pipeline stages, data sources...',
  '/approach': 'Search pipeline stages, data sources...',
}

export default function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [csvSnapshotMode, setCsvSnapshotMode] = useState(true)
  const [lineageOpen, setLineageOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [dataResults, setDataResults] = useState<{ label: string; to: string; meta: string }[]>([])
  const placeholder = pageSearch[location.pathname] ?? 'Search skills, industries...'

  const routeResults = [
    { label: query ? `${query} skill page` : 'Skill Explorer', to: `/skills${query ? `?search=${encodeURIComponent(query)}` : ''}`, meta: 'skills, SES, demand, salary' },
    { label: query ? `${query} forecast` : 'Forecasts', to: `/forecasts${query ? `?q=${encodeURIComponent(query)}` : ''}`, meta: '1Y/3Y forecast index' },
    { label: query ? `${query} industry usage` : 'Industries', to: `/industries${query ? `?search=${encodeURIComponent(query)}` : ''}`, meta: 'industry demand and SES' },
    { label: query ? `${query} roadmap recommendations` : 'Roadmaps', to: '/roadmaps', meta: 'learning plan' },
    { label: query ? `Ask AI about ${query}` : 'Career Advisor', to: '/advisor', meta: 'grounded AI answer' },
  ]
  const results = query.trim() ? [...dataResults, ...routeResults].slice(0, 8) : routeResults

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setDataResults([])
      return
    }
    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        const [skills, industries] = await Promise.all([
          skillsApi.list({ q: term, per_page: 5, sort_by: 'ses_score', sort_dir: 'desc' }),
          industriesApi.list(),
        ])
        if (cancelled) return
        const lower = term.toLowerCase()
        const skillMatches = (skills.items ?? []).map((skill) => ({
          label: skill.name,
          to: `/skills?search=${encodeURIComponent(skill.name)}`,
          meta: `Skill - ${skill.category ?? 'tracked'} - SES ${Math.round((skill.ses_score ?? 0) * 100)}`,
        }))
        const industryMatches = industries
          .filter((industry) => industry.name.toLowerCase().includes(lower) || industry.top_skills?.some((skill) => skill.toLowerCase().includes(lower)))
          .slice(0, 3)
          .map((industry) => ({ label: industry.name, to: `/industries?search=${encodeURIComponent(industry.id)}`, meta: 'Industry - demand, SES, forecast' }))
        const methodMatches = ['Holt Trend', 'Exponential Smoothing', 'Feature-Based Projection']
          .filter((method) => method.toLowerCase().includes(lower))
          .map((method) => ({ label: method, to: `/forecasts?q=${encodeURIComponent(method)}`, meta: 'Forecast method' }))
        setDataResults([...skillMatches, ...industryMatches, ...methodMatches])
      } catch {
        if (!cancelled) setDataResults([])
      }
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [query])

  const submitSearch = () => {
    navigate(`/skills${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
    setFocused(false)
  }

  useEffect(() => {
    const onDataSource = () => setCsvSnapshotMode(true)
    window.addEventListener('skilllens:data-source', onDataSource)
    return () => window.removeEventListener('skilllens:data-source', onDataSource)
  }, [])

  return (
    <header className="h-14 bg-[#050815]/62 backdrop-blur-xl border-b border-white/10 flex items-center px-5 gap-4">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch()
              if (event.key === 'Escape') setFocused(false)
            }}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--text-secondary)] placeholder-[var(--text-subtle)] focus:outline-none focus:border-violet-500/50"
          />
          {focused && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-white/10 bg-[#060a19] shadow-2xl">
              {results.map((item) => (
                <button
                  key={item.to + item.label}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    navigate(item.to)
                    setFocused(false)
                  }}
                  className="block w-full border-b border-white/5 px-3 py-2.5 text-left last:border-b-0 hover:bg-white/[0.045]"
                >
                  <span className="block text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                  <span className="text-xs text-[var(--text-subtle)]">{item.meta}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {csvSnapshotMode && (
        <div className="relative hidden md:block">
          <button
            onClick={() => setLineageOpen((value) => !value)}
            className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-400/12"
          >
            CSV Snapshot - {csvSnapshotMetadata.skill_count} skills
          </button>
          {lineageOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-xl border border-white/10 bg-[#060a19] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <b className="text-sm text-white">Data lineage</b>
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">Live CSV</span>
              </div>
              <div className="space-y-2 text-xs text-white/52">
                <p><span className="text-white/32">Skills:</span> {csvSnapshotMetadata.skill_count}</p>
                <p><span className="text-white/32">Skill-year rows:</span> {csvSnapshotMetadata.history_records.toLocaleString()}</p>
                <p><span className="text-white/32">Last processed:</span> Today</p>
                <p><span className="text-white/32">Sources:</span> master_skill, forecast_results, industry_analytics, ses_rankings</p>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

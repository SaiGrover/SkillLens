import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, Search, Sparkles, Target, TrendingUp } from 'lucide-react'
import { approachApi, forecastApi, MethodDistribution, PipelineStats, SkillSummary, skillsApi } from '@/services/api'
import { buildSkillGuide, formatCategoryLabel } from '@/lib/skillGuideContent'
import { filterUserFacingSkills } from '@/lib/skillQuality'
import { skillDemandIndex } from '@/lib/utils'
import { externalMarketTrend } from '@/lib/externalBenchmarks'

function score(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function forecastTone(trend?: string) {
  const label = trend?.toLowerCase() ?? ''
  if (label.includes('explosive') || label.includes('growing')) return 'text-emerald-300'
  if (label.includes('declin')) return 'text-rose-300'
  return 'text-violet-200'
}

function normalizedCategory(value?: string) {
  return (value ?? 'Unassigned').trim().toLowerCase().replace(/[\s/-]+/g, '_')
}

export default function SkillsGuide() {
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [methods, setMethods] = useState<MethodDistribution[]>([])

  useEffect(() => {
    async function load() {
      try {
        const [result, statsResult, methodResult] = await Promise.all([
          skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' }),
          approachApi.stats().catch(() => null),
          forecastApi.methodDistribution().catch(() => []),
        ])
        setSkills(filterUserFacingSkills(result.items ?? []))
        setStats(statsResult)
        setMethods(methodResult)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(skills.map((skill) => skill.category ?? 'Unassigned'))).sort()],
    [skills],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return skills.filter((skill) => {
      const textMatch =
        !term ||
        [skill.name, skill.category, skill.archetype, skill.forecast_trend].some((value) =>
          value?.toLowerCase().includes(term),
        )
      return textMatch && (category === 'All' || normalizedCategory(skill.category) === normalizedCategory(category))
    })
  }, [skills, search, category])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-[var(--text-muted)]">
        Loading the skill guide from processed datasets...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <header>
        <h1 className="page-title flex items-center gap-3">
          <BookOpen size={30} className="text-fuchsia-300" strokeWidth={1.75} />
          Skill Guide
        </h1>
        <p className="page-subtitle max-w-3xl">
          A detailed reference for {skills.length} canonical skills in the processed HSEP dataset - what each skill is,
          where it is used, and how workforce signals rank its career outlook.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">{stats?.total_skills ?? skills.length} canonical skills</span>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs text-violet-100">{stats?.history_records.toLocaleString() ?? '...'} skill-year records</span>
          <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs text-fuchsia-100">{methods.length || '...'} forecast methods in use</span>
        </div>
      </header>

      <section className="glass rounded-xl border border-white/8 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a skill, category, archetype, or forecast..."
              className="w-full rounded-lg border border-white/12 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/38 focus:border-fuchsia-400/50 focus:ring-1 focus:ring-fuchsia-400/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === item
                    ? 'border-fuchsia-400/40 bg-fuchsia-400/14 text-fuchsia-100'
                    : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-white/18 hover:text-white/82'
                }`}
              >
                {formatCategoryLabel(item === 'All' ? 'All' : item)}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-white/42">
          Showing {filtered.length} skills{category !== 'All' ? ` in ${formatCategoryLabel(category)}` : ''}. Generic umbrella labels from the raw skill universe are filtered out so this guide focuses on concrete, learnable skills.
        </p>
      </section>

      <section className="skills-guide-table overflow-hidden rounded-xl border border-white/8 bg-[#071024]/90 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <div className="skills-guide-row skills-guide-head section-label">
          <span>Skill</span>
          <span>Category</span>
          <span>SES</span>
          <span>Forecast</span>
          <span />
        </div>

        <div className="divide-y divide-white/6">
          {filtered.map((skill) => {
            const guide = buildSkillGuide(skill)
            return (
              <details key={skill.id} className="group">
                <summary className="skills-guide-row cursor-pointer list-none text-sm transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <b className="block text-base font-semibold text-[var(--text-primary)]">{skill.name}</b>
                    <small className="mt-0.5 block text-xs leading-relaxed text-[var(--text-subtle)]">
                      {skill.id} - archetype: {skill.archetype ?? 'Tracked skill'}
                    </small>
                  </span>
                  <span className="self-center"><span className="skills-guide-category-pill">{formatCategoryLabel(skill.category)}</span></span>
                  <span className="self-center text-[15px] font-bold tabular-nums text-fuchsia-200">{score(skill.ses_score)}</span>
                  <span className={`self-center text-[13px] capitalize ${forecastTone(externalMarketTrend(skill))}`}>
                    {externalMarketTrend(skill) ?? 'Tracked'}
                  </span>
                  <ChevronDown size={16} className="self-center text-white/35 transition-transform duration-200 group-open:rotate-180" />
                </summary>

                <div className="border-t border-white/6 bg-gradient-to-b from-white/[0.035] to-white/[0.015] px-5 py-5">
                  <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                    <div className="space-y-5">
                      <section>
                        <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-violet-200/90">
                          <BookOpen size={14} />
                          About this skill
                        </h3>
                        <p className="body-text text-[15px] leading-[1.7] text-white/80">{guide.about}</p>
                      </section>

                      <section>
                        <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200/90">
                          <Target size={14} />
                          Typical use cases
                        </h3>
                        <ul className="space-y-2">
                          {guide.useCases.map((item) => (
                            <li key={item} className="flex gap-2.5 text-[14px] leading-relaxed text-white/72">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/80" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>

                    <div className="space-y-4">
                      <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-amber-200/90">
                          <TrendingUp size={14} />
                          Career outlook
                        </h3>
                        <p className="text-[14px] leading-[1.65] text-white/74">{guide.careerOutlook}</p>
                      </section>

                      <section className="rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
                        <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.08em] text-violet-200/90">
                          <Sparkles size={14} />
                          Suggested learning path
                        </h3>
                        <p className="text-[14px] leading-[1.65] text-white/74">{guide.learningPath}</p>
                      </section>

                      <div className="flex flex-wrap gap-2">
                        <MetricPill label="Demand Index" value={`${skillDemandIndex(skill)}/100`} />
                        <MetricPill label="Salary value" value={`${score(skill.salary_premium)}/100`} />
                        <MetricPill label="Safety tier" value={skill.ses_tier ?? 'Not classified'} />
                        <MetricPill label="Forecast method" value={skill.forecast_method ?? 'Dataset projection'} />
                        {skill.lifecycle && <MetricPill label="Lifecycle" value={skill.lifecycle} />}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            )
          })}

          {!filtered.length && (
            <p className="px-5 py-14 text-center text-sm text-white/50">No skills match this guide filter.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/72">
      <span className="text-white/45">{label}: </span>
      {value}
    </span>
  )
}

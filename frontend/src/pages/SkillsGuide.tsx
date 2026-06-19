import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, Search, Sparkles, Target, TrendingUp } from 'lucide-react'
import { SkillSummary, skillsApi } from '@/services/api'
import { buildSkillGuide, formatCategoryLabel } from '@/lib/skillGuideContent'

function score(value?: number) {
  return Math.round((value ?? 0) * 100)
}

function forecastTone(trend?: string) {
  const label = trend?.toLowerCase() ?? ''
  if (label.includes('explosive') || label.includes('growing')) return 'text-emerald-300'
  if (label.includes('declin')) return 'text-rose-300'
  return 'text-sky-200'
}

export default function SkillsGuide() {
  const [skills, setSkills] = useState<SkillSummary[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
        setSkills(result.items ?? [])
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
      return textMatch && (category === 'All' || (skill.category ?? 'Unassigned') === category)
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
          <BookOpen size={30} className="text-cyan-300" strokeWidth={1.75} />
          Skill Guide
        </h1>
        <p className="page-subtitle max-w-3xl">
          A detailed reference for all {skills.length} skills in the processed HSEP dataset — what each skill is,
          where it is used, and how workforce signals rank its career outlook.
        </p>
      </header>

      <section className="glass rounded-xl border border-white/8 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a skill, category, archetype, or forecast..."
              className="w-full rounded-lg border border-white/12 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/38 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === item
                    ? 'border-cyan-400/40 bg-cyan-400/14 text-cyan-100'
                    : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-white/18 hover:text-white/82'
                }`}
              >
                {formatCategoryLabel(item === 'All' ? 'All' : item)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#071024]/90 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-[minmax(180px,1fr)_150px_90px_120px] gap-4 border-b border-white/8 px-5 py-3.5 section-label">
          <span>Skill</span>
          <span>Category</span>
          <span>SES</span>
          <span>Forecast</span>
        </div>

        <div className="divide-y divide-white/6">
          {filtered.map((skill) => {
            const guide = buildSkillGuide(skill)
            return (
              <details key={skill.id} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(180px,1fr)_150px_90px_120px] gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span>
                      <b className="block text-base font-semibold text-[var(--text-primary)]">{skill.name}</b>
                      <small className="mt-1 block text-xs leading-relaxed text-[var(--text-subtle)]">
                        {skill.archetype ?? 'Tracked skill'}
                      </small>
                    </span>
                    <ChevronDown
                      size={16}
                      className="mt-1 shrink-0 text-white/35 transition-transform duration-200 group-open:rotate-180"
                    />
                  </span>
                  <span className="self-center text-[13px] text-white/68">{formatCategoryLabel(skill.category)}</span>
                  <span className="self-center text-[15px] font-bold tabular-nums text-cyan-200">{score(skill.ses_score)}</span>
                  <span className={`self-center text-[13px] capitalize ${forecastTone(skill.forecast_trend)}`}>
                    {skill.forecast_trend ?? 'Tracked'}
                  </span>
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
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80" />
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
                        <MetricPill label="Demand" value={`${score(skill.linkedin_demand)}/100`} />
                        <MetricPill label="Salary premium" value={`+${score(skill.salary_premium)}%`} />
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

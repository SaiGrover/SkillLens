import { useState } from 'react'
import {
  Database, Search, GitBranch, Layers, ShieldCheck, Network,
  LineChart, FlaskConical, Sparkles, Users, Clock, BarChart3,
  BookOpen, Brain, Eye, Monitor, AlertTriangle,
  ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react'

/* ─── Scale Cards ─── */
const scaleCards = [
  ['120K+', 'jobs processed'],
  ['213K+', 'job-skill mappings'],
  ['39K', 'extracted skill mentions'],
  ['113', 'final ranked skills'],
  ['1,209', 'skill-year observations'],
  ['8', 'industries covered'],
]

/* ─── Pipeline Stages (flowchart nodes) ─── */
const stages = [
  {
    title: 'Data Collection',
    icon: Database,
    color: 'from-blue-500 to-cyan-400',
    glow: 'rgba(59,130,246,0.25)',
    description:
      'Collect workforce and technology-related datasets from multiple sources — LinkedIn job postings, salary datasets, Stack Overflow Developer Surveys, and skill extraction taxonomies — to build a multi-signal intelligence foundation.',
    input: 'Raw CSV files from LinkedIn jobs, Stack Overflow surveys, salary databases, job-skill relationship datasets, and skill taxonomy sources',
    output: 'Unified raw data tables containing job postings, salary records, survey responses, and skill mention records',
  },
  {
    title: 'Data Cleaning & Normalization',
    icon: Search,
    color: 'from-cyan-500 to-teal-400',
    glow: 'rgba(6,182,212,0.25)',
    description:
      'Standardize inconsistent skill names, remove duplicates, handle missing values, apply alias mapping (e.g. Node.js → nodejs, C# → csharp), and filter noisy non-technical terms so that every skill is recognized consistently across all datasets.',
    input: 'Raw data tables with inconsistent skill names, duplicates, missing values, and noisy non-technical terms',
    output: 'Cleaned, normalized, and cross-dataset-matched records with canonical skill identifiers',
  },
  {
    title: 'Skill Universe Expansion',
    icon: GitBranch,
    color: 'from-teal-500 to-emerald-400',
    glow: 'rgba(20,184,166,0.25)',
    description:
      'Expand the skill set from a small manually selected list to a comprehensive universe by analyzing millions of skill mentions from large-scale job-skill data. Strategically important modern skills like LangChain, LLM, RAG, Power BI, and Tableau are also recovered manually.',
    input: 'Cleaned skill mention records and initial small skill set',
    output: 'Expanded skill universe covering programming, AI/ML, data science, analytics, cloud, DevOps, databases, cybersecurity, and software engineering',
  },
  {
    title: 'Skill Classification & Taxonomy',
    icon: ShieldCheck,
    color: 'from-emerald-500 to-green-400',
    glow: 'rgba(16,185,129,0.25)',
    description:
      'Separate useful technical skills from irrelevant terms using NLP-based classification. Organize skills into meaningful categories such as Programming, AI/ML, Data Science, Cloud Computing, DevOps, Cybersecurity, and Software Engineering for structured display across the platform.',
    input: 'Expanded skill universe containing technical skills, soft skills, certifications, domain knowledge, and noise',
    output: 'Classified skill taxonomy with category labels, ready for Skill Explorer, Industries, Roadmaps, and Career Advisor pages',
  },
  {
    title: 'Feature Engineering',
    icon: Layers,
    color: 'from-green-500 to-lime-400',
    glow: 'rgba(34,197,94,0.25)',
    description:
      'Generate workforce intelligence features for every skill — LinkedIn Demand, Salary Premium, Current Usage, Future Interest, Global Adoption Score, and Growth Rate — representing different dimensions of skill relevance.',
    input: 'Classified skill taxonomy, cleaned job postings, salary records, survey responses, and adoption data',
    output: 'master_skill_dataset feature matrix with six workforce intelligence signals per skill',
  },
  {
    title: 'Temporal Skill Intelligence',
    icon: Clock,
    color: 'from-lime-500 to-yellow-400',
    glow: 'rgba(132,204,22,0.25)',
    description:
      'Reconstruct historical skill demand and adoption patterns across multiple years using multi-year Stack Overflow survey data. Understand how long a skill has existed, whether adoption is increasing or decreasing, and whether it has stable long-term relevance.',
    input: 'Multi-year Stack Overflow survey data and historical skill demand records',
    output: 'Temporal adoption profiles, trend direction, and historical coverage length per skill',
  },
  {
    title: 'Skill Archetype Discovery',
    icon: Network,
    color: 'from-yellow-500 to-amber-400',
    glow: 'rgba(234,179,8,0.25)',
    description:
      'Use unsupervised K-Means clustering on scaled workforce features (demand, salary, usage, future interest, adoption, growth) to discover four natural workforce archetypes: Future-Proof, Growing, Stable, and High-Risk.',
    input: 'Scaled feature matrix (linkedin_demand, salary_premium, current_usage, future_interest, global_adoption_score, growth_rate)',
    output: 'Archetype label per skill — Future-Proof, Growing, Stable, or High-Risk — representing distinct workforce behavior patterns',
  },
  {
    title: 'Hybrid Forecasting',
    icon: LineChart,
    color: 'from-amber-500 to-orange-400',
    glow: 'rgba(245,158,11,0.25)',
    description:
      'Apply a hybrid forecasting framework that selects the best method based on historical coverage: Holt\'s Trend (10+ years), Exponential Smoothing (7–9 years), or Feature-Based Projection (< 7 years). This ensures both mature and emerging skills receive appropriate forecasts.',
    input: 'Temporal adoption profiles, historical coverage length, and feature matrix',
    output: '1-year, 2-year, 3-year forecast indexes with forecast score, confidence level, and trend classification (Explosive, Growing, Stable, Declining)',
  },
  {
    title: 'SES Computation',
    icon: FlaskConical,
    color: 'from-orange-500 to-red-400',
    glow: 'rgba(249,115,22,0.25)',
    description:
      'Compute the Skill Extinction Score (SES) — the central scoring layer — by combining workforce demand, salary premium, adoption, future interest, growth rate, forecast intelligence, archetype, and risk behavior into a single composite safety score with interpretable tiers.',
    input: 'Feature matrix, forecast outputs, archetype labels, and risk behavior signals',
    output: 'SES Score, SES tier (Very Safe / Safe / Moderate / Risky), rank, and explainability components per skill',
  },
  {
    title: 'Industry Analytics',
    icon: BarChart3,
    color: 'from-red-500 to-pink-400',
    glow: 'rgba(239,68,68,0.25)',
    description:
      'Aggregate skill-level intelligence at the industry level. Map skills into workforce domains (AI/ML, Data Science, Cloud/DevOps, etc.) and calculate average SES, demand, salary premium, future interest, adoption, growth, forecasted demand, and archetype distribution per industry.',
    input: 'SES-ranked skills, industry-skill mappings, and forecast outputs',
    output: 'Industry rankings with average metrics, top skills, archetype composition, and forecast growth per domain',
  },
  {
    title: 'Skill Ranking by Industry',
    icon: BookOpen,
    color: 'from-pink-500 to-rose-400',
    glow: 'rgba(236,72,153,0.25)',
    description:
      'Rank skills within each industry to show the most valuable technologies per domain — for example, the top skills in AI/ML, Data Science, Cloud/DevOps, or Software Engineering — allowing users to explore opportunities in their target field.',
    input: 'Industry analytics, SES-ranked skills, and domain-specific skill mappings',
    output: 'Ordered skill rankings per industry with SES scores, demand, and forecast trends',
  },
  {
    title: 'Career Recommendation',
    icon: Brain,
    color: 'from-rose-500 to-violet-400',
    glow: 'rgba(244,63,94,0.25)',
    description:
      'Generate personalized skill recommendations based on current skills, career goal, skill gap analysis, SES scores, forecast trends, industry demand, salary value, related skills, and risk levels. Suggestions are grounded in HSEP intelligence rather than being random.',
    input: 'User\'s current skills, target career goal, SES rankings, forecast data, and industry analytics',
    output: 'Prioritized learning recommendations with skill gap analysis, risk assessment, and explainable reasoning',
  },
  {
    title: 'AI Career Advisor',
    icon: Users,
    color: 'from-violet-500 to-purple-400',
    glow: 'rgba(139,92,246,0.25)',
    description:
      'Provide a conversational AI layer on top of HSEP intelligence that answers career questions using SES rankings, forecasts, archetypes, industry analytics, salary signals, and roadmap logic — producing grounded, explainable, and data-backed career guidance.',
    input: 'User question plus retrieved SES rankings, forecast records, archetype data, industry analytics, and related skills',
    output: 'Grounded career guidance with source citations, next-skill recommendations, and structured learning roadmaps',
  },
  {
    title: 'Explainability Layer',
    icon: Eye,
    color: 'from-purple-500 to-indigo-400',
    glow: 'rgba(168,85,247,0.25)',
    description:
      'Ensure every score and recommendation is transparent. Explain why a skill was ranked high or flagged as risky, what signals support the result, how confident the forecast is, which industries use the skill, and what the user should learn next.',
    input: 'SES scores, forecast confidence, archetype labels, feature contributions, and industry mappings',
    output: 'Human-readable explanations, feature contribution breakdowns, confidence indicators, and actionable reasoning per skill',
  },
  {
    title: 'Dashboard & Website Output',
    icon: Monitor,
    color: 'from-indigo-500 to-blue-400',
    glow: 'rgba(99,102,241,0.25)',
    description:
      'Power multiple website pages — Dashboard, Skill Explorer, Forecasts, Industries, Career Advisor, Roadmaps, Reports, and Methodology — transforming raw workforce data into an interactive, explainable career intelligence platform.',
    input: 'Complete HSEP intelligence: SES rankings, forecasts, industry analytics, archetypes, recommendations, and explainability data',
    output: 'Interactive web platform with searchable skills, visual forecasts, industry rankings, AI-assisted career guidance, and exportable reports',
  },
]

/* ─── Forecast Methods ─── */
const methods: [string, string, string][] = [
  ['Holt Trend', 'Used for skills with 10+ years of history', 'High confidence'],
  ['Exponential Smoothing', 'Used for 7–9 years of history', 'Medium confidence'],
  ['Feature-Based Projection', 'Used for emerging skills with limited history', 'Lower confidence'],
]

/* ─── Limitations ─── */
const limitations = [
  'LinkedIn data is snapshot-based and should be refreshed for production use.',
  'Salary values are relative premium signals and may require imputation.',
  'Emerging skills can have limited history, so confidence may be lower.',
  'Forecasts are confidence-based estimates, not absolute truth.',
  'Stack Overflow and LinkedIn skill names require normalization before comparison.',
  'Recommendation quality depends on the quality of available skill intelligence.',
]

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function Approach() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div>
        <span className="inline-flex rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
          Research Methodology
        </span>
        <h1 className="page-title mt-3">
          How SkillLens AI Works
        </h1>
        <p className="page-subtitle max-w-3xl">
          SkillLens AI is built using the Human Skill Extinction Predictor (HSEP) methodology.
          The system combines workforce demand, salary intelligence, developer adoption, historical technology trends,
          forecasting, clustering, and career recommendation research to identify which skills are future-proof, growing, stable, or at risk.
        </p>
      </div>

      {/* ── Scale Cards ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {scaleCards.map(([value, label]) => (
          <div key={label} className="glass rounded-xl border border-white/5 p-4">
            <b className="block text-2xl text-white">{value}</b>
            <span className="mt-1 block text-xs text-white/38">{label}</span>
          </div>
        ))}
      </section>

      {/* ── Flowchart Section ── */}
      <section className="glass rounded-xl border border-white/5 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">HSEP Pipeline Flowchart</h2>
            <p className="mt-1 text-xs text-white/35">
              Each node shows the stage heading, description, and its Input → Output
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <ArrowDown size={12} className="text-cyan-400 animate-bounce" />
            <span className="text-[10px] font-medium text-white/40">SCROLL PIPELINE</span>
          </div>
        </div>

        {/* Flowchart vertical timeline */}
        <div className="hsep-flowchart">
          {stages.map((stage, index) => (
            <FlowchartNode
              key={stage.title}
              stage={stage}
              index={index}
              isLast={index === stages.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ── Forecast Methods + Limitations ── */}
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="glass rounded-xl border border-white/5 p-5">
          <h2 className="section-title">Forecast method selection</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {methods.map(([title, use, confidence]) => (
              <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
                <b className="text-sm text-white">{title}</b>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{use}</p>
                <span className="mt-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-200">
                  {confidence}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-xl border border-white/5 p-5">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-300" />
            Limitations
          </h2>
          <div className="mt-4 space-y-2">
            {limitations.map((item) => (
              <p key={item} className="rounded-lg border border-white/7 bg-white/[0.035] px-3 py-2 text-sm leading-relaxed text-white/52">
                {item}
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ═══════════════ FLOWCHART NODE ═══════════════ */
function FlowchartNode({
  stage,
  index,
  isLast,
}: {
  stage: typeof stages[number]
  index: number
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = stage.icon
  const stepNum = String(index + 1).padStart(2, '0')

  return (
    <div className="hsep-flowchart__node-wrapper">
      {/* ── Connector line + dot ── */}
      <div className="hsep-flowchart__rail">
        <div
          className="hsep-flowchart__dot"
          style={{ boxShadow: `0 0 12px ${stage.glow}, 0 0 24px ${stage.glow}` }}
        >
          <div className={`hsep-flowchart__dot-inner bg-gradient-to-br ${stage.color}`} />
        </div>
        {!isLast && <div className="hsep-flowchart__connector" />}
      </div>

      {/* ── Node Card ── */}
      <div
        className="hsep-flowchart__card group"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stage.color} shadow-lg`}
            style={{ boxShadow: `0 4px 20px ${stage.glow}` }}
          >
            <Icon size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
              Step {stepNum}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-white leading-tight">
              {stage.title}
            </h3>
          </div>
          <button
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition-all group-hover:border-white/20 group-hover:text-white/60"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Description */}
        <p className={`mt-3 text-xs leading-relaxed text-white/50 ${expanded ? '' : 'line-clamp-2'}`}>
          {stage.description}
        </p>

        {/* Input / Output pills */}
        <div className={`mt-4 grid gap-3 ${expanded ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`}>
          <IOBlock label="Input" value={stage.input} variant="input" expanded={expanded} />
          <IOBlock label="Output" value={stage.output} variant="output" expanded={expanded} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ INPUT / OUTPUT BLOCK ═══════════════ */
function IOBlock({
  label,
  value,
  variant,
  expanded,
}: {
  label: string
  value: string
  variant: 'input' | 'output'
  expanded: boolean
}) {
  const isInput = variant === 'input'
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        isInput
          ? 'border-cyan-400/15 bg-cyan-400/[0.04]'
          : 'border-violet-400/15 bg-violet-400/[0.04]'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          isInput ? 'text-cyan-300/60' : 'text-violet-300/60'
        }`}
      >
        {label}
      </p>
      <p className={`mt-1 text-xs leading-relaxed text-white/55 ${expanded ? '' : 'line-clamp-2'}`}>
        {value}
      </p>
    </div>
  )
}

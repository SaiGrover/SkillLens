import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  Database, Search, GitBranch, Layers, ShieldCheck, Network,
  LineChart, FlaskConical, Sparkles, Users, Clock, BarChart3,
  BookOpen, Brain, Eye, Monitor, AlertTriangle,
  ArrowDown, ChevronDown, ChevronUp
} from 'lucide-react'
import { clusterPoints, evidenceFeatures, featureCorrelation, silhouetteScores } from '@/data/methodologyEvidence'
import {
  advisorDemoPrompts,
  datasetInventory,
  featureAverages,
  forecastMethodCounts,
  forecastTrendCounts,
  historyYearCounts,
  industryMetricRows,
  industrySkillCounts,
  knowledgeBaseArchetypes,
  sesTierCounts,
  taxonomyCategoryCounts,
  topSesRows,
} from '@/data/methodologyEvidenceExtra'
import { approachApi, PipelineStats } from '@/services/api'

const Plot = lazy(async () => {
  const [{ default: createPlotlyComponent }, { default: plotly }] = await Promise.all([
    import('react-plotly.js/factory'),
    import('plotly.js-cartesian-dist-min'),
  ])
  return { default: createPlotlyComponent(plotly) }
})

/* â”€â”€â”€ Scale Cards â”€â”€â”€ */
const scaleCards = [
  ['120K+', 'jobs processed'],
  ['213K+', 'job-skill mappings'],
  ['39K', 'extracted skill mentions'],
  ['111', 'canonical ranked skills'],
  ['2,255', 'skill-year observations'],
  ['8', 'industries covered'],
]

/* â”€â”€â”€ Pipeline Stages (flowchart nodes) â”€â”€â”€ */
const stages = [
  {
    title: 'Data Collection',
    icon: Database,
    color: 'from-purple-500 to-fuchsia-400',
    glow: 'rgba(59,130,246,0.25)',
    description:
      'Collect workforce and technology-related datasets from multiple sources - LinkedIn job postings, salary datasets, Stack Overflow Developer Surveys, and skill extraction taxonomies - to build a multi-signal intelligence foundation.',
    input: 'Raw CSV files from LinkedIn jobs, Stack Overflow surveys, salary databases, job-skill relationship datasets, and skill taxonomy sources',
    output: 'Unified raw data tables containing job postings, salary records, survey responses, and skill mention records',
  },
  {
    title: 'Data Cleaning & Normalization',
    icon: Search,
    color: 'from-fuchsia-500 to-teal-400',
    glow: 'rgba(6,182,212,0.25)',
    description:
      'Standardize inconsistent skill names, remove duplicates, handle missing values, apply alias mapping (e.g. Node.js to nodejs, C# to csharp), and filter noisy non-technical terms so that every skill is recognized consistently across all datasets.',
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
    output: 'Classified skill taxonomy with category labels, ready for Skill Explorer, Industries, Skill Recommender, and Career Advisor pages',
  },
  {
    title: 'Feature Engineering',
    icon: Layers,
    color: 'from-green-500 to-lime-400',
    glow: 'rgba(34,197,94,0.25)',
    description:
      'Generate workforce intelligence features for every skill - LinkedIn Demand, Salary Premium, Current Usage, Future Interest, Global Adoption Score, and Growth Rate - representing different dimensions of skill relevance.',
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
    output: 'Archetype label per skill - Future-Proof, Growing, Stable, or High-Risk - representing distinct workforce behavior patterns',
  },
  {
    title: 'Hybrid Forecasting',
    icon: LineChart,
    color: 'from-amber-500 to-orange-400',
    glow: 'rgba(245,158,11,0.25)',
    description:
      'Apply a hybrid forecasting framework that selects the best method based on historical coverage: Holt\'s Trend (10+ years), Exponential Smoothing (7-9 years), or Feature-Based Projection (< 7 years). This ensures both mature and emerging skills receive appropriate forecasts.',
    input: 'Temporal adoption profiles, historical coverage length, and feature matrix',
    output: '1-year, 2-year, 3-year forecast indexes with forecast score, confidence level, and trend classification (Explosive, Growing, Stable, Declining)',
  },
  {
    title: 'SES Computation',
    icon: FlaskConical,
    color: 'from-orange-500 to-red-400',
    glow: 'rgba(249,115,22,0.25)',
    description:
      'Compute the Skill Extinction Score (SES) - the central scoring layer - by combining workforce demand, salary premium, adoption, future interest, growth rate, forecast intelligence, archetype, and risk behavior into a single composite safety score with interpretable tiers.',
    input: 'Feature matrix, forecast outputs, archetype labels, and risk behavior signals',
    output: 'SES Score, SES tier (Very Safe / Safe / Moderate / Riviolet), rank, and explainability components per skill',
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
      'Rank skills within each industry to show the most valuable technologies per domain - for example, the top skills in AI/ML, Data Science, Cloud/DevOps, or Software Engineering - allowing users to explore opportunities in their target field.',
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
      'Provide a conversational AI layer on top of HSEP intelligence that answers career questions using SES rankings, forecasts, archetypes, industry analytics, salary signals, and role-fit recommendation logic - producing grounded, explainable, and data-backed career guidance.',
    input: 'User question plus retrieved SES rankings, forecast records, archetype data, industry analytics, and related skills',
    output: 'Grounded career guidance with source citations, next-skill recommendations, and role-fit tool suggestions',
  },
  {
    title: 'Explainability Layer',
    icon: Eye,
    color: 'from-purple-500 to-indigo-400',
    glow: 'rgba(168,85,247,0.25)',
    description:
      'Ensure every score and recommendation is transparent. Explain why a skill was ranked high or flagged as riviolet, what signals support the result, how confident the forecast is, which industries use the skill, and what the user should learn next.',
    input: 'SES scores, forecast confidence, archetype labels, feature contributions, and industry mappings',
    output: 'Human-readable explanations, feature contribution breakdowns, confidence indicators, and actionable reasoning per skill',
  },
  {
    title: 'Dashboard & Website Output',
    icon: Monitor,
    color: 'from-indigo-500 to-purple-400',
    glow: 'rgba(99,102,241,0.25)',
    description:
      'Power multiple website pages - Dashboard, Skill Explorer, Forecasts, Industries, Career Advisor, Skill Recommender, Reports, and Methodology - transforming raw workforce data into an interactive, explainable career intelligence platform.',
    input: 'Complete HSEP intelligence: SES rankings, forecasts, industry analytics, archetypes, recommendations, and explainability data',
    output: 'Interactive web platform with searchable skills, visual forecasts, industry rankings, AI-assisted career guidance, and exportable reports',
  },
]

/* â”€â”€â”€ Forecast Methods â”€â”€â”€ */
const methods: [string, string, string][] = [
  ['Holt Trend', 'Used for skills with 10+ years of history', 'High confidence'],
  ['Exponential Smoothing', 'Used for 7-9 years of history', 'Medium confidence'],
  ['Feature-Based Projection', 'Used for emerging skills with limited history', 'Lower confidence'],
]

/* â”€â”€â”€ Limitations â”€â”€â”€ */
const limitations = [
  'LinkedIn data is snapshot-based and should be refreshed for production use.',
  'Salary values are relative premium signals and may require imputation.',
  'Emerging skills can have limited history, so confidence may be lower.',
  'Forecasts are confidence-based estimates, not absolute truth.',
  'Stack Overflow and LinkedIn skill names require normalization before comparison.',
  'Recommendation quality depends on the quality of available skill intelligence.',
]

type MethodologyArtifact = { label: string; href: string; note?: string }

const methodologyResources: Record<string, { notebooks: MethodologyArtifact[]; datasets: MethodologyArtifact[]; preview?: { src: string; alt: string; caption: string } }> = {
  'Data Collection': {
    notebooks: [
      { label: '01_Dataset_Inventory.ipynb', href: '/methodology/notebooks/01_Dataset_Inventory.ipynb' },
      { label: '02_EDA_LinkedIn.ipynb', href: '/methodology/notebooks/02_EDA_LinkedIn.ipynb' },
      { label: '03_EDA_StackOverflow.ipynb', href: '/methodology/notebooks/03_EDA_StackOverflow.ipynb' },
    ],
    datasets: [
      { label: 'expanded_skill_master.csv', href: '/methodology/datasets/expanded_skill_master.csv', note: 'expanded canonical skill universe' },
      { label: 'global_adoption_stackoverflow.csv', href: '/methodology/datasets/global_adoption_stackoverflow.csv', note: 'developer adoption source' },
    ],
  },
  'Data Cleaning & Normalization': {
    notebooks: [
      { label: '04C_NLP_Skill_Extraction_SES_Pipeline.ipynb', href: '/methodology/notebooks/04C_NLP_Skill_Extraction_SES_Pipeline.ipynb' },
      { label: '04D_SkillNER_Extraction_Final.ipynb', href: '/methodology/notebooks/04D_SkillNER_Extraction_Final.ipynb' },
      { label: '08B_Skill_History_Normalization.ipynb', href: '/methodology/notebooks/08B_Skill_History_Normalization.ipynb' },
    ],
    datasets: [
      { label: 'skill_taxonomy_dictionary.csv', href: '/methodology/datasets/skill_taxonomy_dictionary.csv', note: 'aliases and normalized labels' },
      { label: 'technical_skill_master.csv', href: '/methodology/datasets/technical_skill_master.csv', note: 'technical-skill filter' },
    ],
  },
  'Skill Universe Expansion': {
    notebooks: [{ label: '08C_Skill_Universe_Expansion.ipynb', href: '/methodology/notebooks/08C_Skill_Universe_Expansion.ipynb' }],
    datasets: [
      { label: 'expanded_skill_master.csv', href: '/methodology/datasets/expanded_skill_master.csv', note: 'expanded workforce skill set' },
      { label: 'taxonomy_gold_247.csv', href: '/methodology/datasets/taxonomy_gold_247.csv', note: 'curated strategic additions' },
    ],
  },
  'Skill Classification & Taxonomy': {
    notebooks: [{ label: '08D_Final_v2_Skill_Taxonomy_Builder.ipynb', href: '/methodology/notebooks/08D_Final_v2_Skill_Taxonomy_Builder.ipynb' }],
    datasets: [{ label: 'skill_taxonomy_dictionary.csv', href: '/methodology/datasets/skill_taxonomy_dictionary.csv', note: 'category and subcategory taxonomy' }],
  },
  'Feature Engineering': {
    notebooks: [
      { label: '04_SES_Feature_Engineering_Final_v3.ipynb', href: '/methodology/notebooks/04_SES_Feature_Engineering_Final_v3.ipynb' },
      { label: '09_Feature_Recalculation_Final.ipynb', href: '/methodology/notebooks/09_Feature_Recalculation_Final.ipynb' },
    ],
    datasets: [
      { label: 'master_skill_dataset_v8.csv', href: '/methodology/datasets/master_skill_dataset_v8.csv', note: 'original feature matrix used in the notebook preview' },
      { label: 'master_skill_dataset_v9.csv', href: '/methodology/datasets/master_skill_dataset_v9.csv', note: 'recalculated feature matrix' },
    ],
  },
  'Temporal Skill Intelligence': {
    notebooks: [
      { label: '08A_Build_Skill_Demand_History_From_StackOverflow.ipynb', href: '/methodology/notebooks/08A_Build_Skill_Demand_History_From_StackOverflow.ipynb' },
      { label: '08E_Longitudinal_History_Rebuilder.ipynb', href: '/methodology/notebooks/08E_Longitudinal_History_Rebuilder.ipynb' },
      { label: '08_Temporal_Intelligence_Feature_Engineering.ipynb', href: '/methodology/notebooks/08_Temporal_Intelligence_Feature_Engineering.ipynb' },
    ],
    datasets: [{ label: 'skill_demand_history_clean.csv', href: '/methodology/datasets/skill_demand_history_clean.csv', note: 'normalized multi-year demand history' }],
  },
  'Skill Archetype Discovery': {
    notebooks: [
      { label: '07_Skill_Clustering.ipynb', href: '/methodology/notebooks/07_Skill_Clustering.ipynb' },
      { label: '10_Skill_Archetype_Clustering_Final.ipynb', href: '/methodology/notebooks/10_Skill_Archetype_Clustering_Final.ipynb' },
    ],
    datasets: [
      { label: 'skill_clusters.csv', href: '/methodology/datasets/skill_clusters.csv', note: 'cluster assignments' },
      { label: 'cluster_summary.csv', href: '/methodology/datasets/cluster_summary.csv', note: 'cluster-level summary' },
    ],
  },
  'Hybrid Forecasting': {
    notebooks: [{ label: '11_Hybrid_Forecasting.ipynb', href: '/methodology/notebooks/11_Hybrid_Forecasting.ipynb' }],
    datasets: [
      { label: 'forecast_results.csv', href: '/methodology/datasets/forecast_results.csv', note: 'method, confidence, and multi-horizon outputs' },
      { label: 'skill_forecasts.csv', href: '/methodology/datasets/skill_forecasts.csv', note: 'forecast export' },
    ],
  },
  'SES Computation': {
    notebooks: [{ label: '12_SES_Computation.ipynb', href: '/methodology/notebooks/12_SES_Computation.ipynb' }],
    datasets: [{ label: 'ses_rankings.csv', href: '/methodology/datasets/ses_rankings.csv', note: 'ranked SES output' }],
  },
  'Industry Analytics': {
    notebooks: [{ label: '13_Industry_Analytics.ipynb', href: '/methodology/notebooks/13_Industry_Analytics.ipynb' }],
    datasets: [
      { label: 'industry_analytics.csv', href: '/methodology/datasets/industry_analytics.csv', note: 'aggregated industry metrics' },
      { label: 'industry_skill_map.csv', href: '/methodology/datasets/industry_skill_map.csv', note: 'skill-to-industry mapping' },
    ],
  },
  'Skill Ranking by Industry': {
    notebooks: [{ label: '13_Industry_Analytics.ipynb', href: '/methodology/notebooks/13_Industry_Analytics.ipynb' }],
    datasets: [{ label: 'industry_skill_map.csv', href: '/methodology/datasets/industry_skill_map.csv', note: 'full mapping used for per-industry ranking' }],
  },
  'Career Recommendation': {
    notebooks: [{ label: '13B_RAG_Knowledge_Base.ipynb', href: '/methodology/notebooks/13B_RAG_Knowledge_Base.ipynb' }],
    datasets: [{ label: 'career_advisor_demo.json', href: '/methodology/datasets/career_advisor_demo.json', note: 'grounded recommendation examples' }],
  },
  'AI Career Advisor': {
    notebooks: [{ label: '14_Career_Advisor.ipynb', href: '/methodology/notebooks/14_Career_Advisor.ipynb' }],
    datasets: [
      { label: 'skill_knowledge_base.json', href: '/methodology/datasets/skill_knowledge_base.json', note: 'retrieval knowledge base' },
      { label: 'career_advisor.py', href: '/methodology/datasets/career_advisor.py', note: 'advisor reference implementation' },
    ],
  },
  'Explainability Layer': {
    notebooks: [{ label: '12_SES_Computation.ipynb', href: '/methodology/notebooks/12_SES_Computation.ipynb' }],
    datasets: [{ label: 'ses_rankings.csv', href: '/methodology/datasets/ses_rankings.csv', note: 'score components and tiers' }],
  },
  'Dashboard & Website Output': {
    notebooks: [{ label: '14_Career_Advisor.ipynb', href: '/methodology/notebooks/14_Career_Advisor.ipynb' }],
    datasets: [
      { label: 'forecast_results.csv', href: '/methodology/datasets/forecast_results.csv' },
      { label: 'industry_analytics.csv', href: '/methodology/datasets/industry_analytics.csv' },
    ],
  },
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MAIN COMPONENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function Approach() {
  const [liveStats, setLiveStats] = useState<PipelineStats | null>(null)

  useEffect(() => {
    approachApi.stats().then(setLiveStats).catch(() => undefined)
  }, [])

  const liveScaleCards = useMemo(() => {
    if (!liveStats) return scaleCards
    return [
      [liveStats.job_postings_processed.toLocaleString(), 'jobs processed'],
      [liveStats.forecast_records.toLocaleString(), 'forecast records'],
      [String(liveStats.total_skills), 'canonical ranked skills'],
      [liveStats.history_records.toLocaleString(), 'skill-year observations'],
      [`${liveStats.forecast_accuracy_pct}%`, 'forecast confidence'],
      [String(liveStats.survey_years_covered), 'survey years covered'],
    ]
  }, [liveStats])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* â”€â”€ Header â”€â”€ */}
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

      {/* â”€â”€ Scale Cards â”€â”€ */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {liveScaleCards.map(([value, label]) => (
          <div key={label} className="glass rounded-xl border border-white/5 p-4">
            <b className="block text-2xl text-white">{value}</b>
            <span className="mt-1 block text-xs text-white/38">{label}</span>
          </div>
        ))}
      </section>

      {/* â”€â”€ Flowchart Section â”€â”€ */}
      <section className="glass rounded-xl border border-white/5 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">HSEP Pipeline Flowchart</h2>
            <p className="mt-1 text-xs text-white/35">
              Each node shows the stage heading, description, and its Input to Output
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
            <ArrowDown size={12} className="text-fuchsia-400 animate-bounce" />
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

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <section className="glass rounded-xl border border-white/5 p-5">
          <h2 className="section-title">Forecast method selection</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {methods.map(([title, use, confidence]) => (
              <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
                <b className="text-sm text-white">{title}</b>
                <p className="mt-2 text-xs leading-relaxed text-white/45">{use}</p>
                <span className="mt-3 inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-1 text-[10px] text-fuchsia-200">
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• FLOWCHART NODE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function CodeSnapshot({ title, code }: { title: string; code: string }) {
  return <div className="overflow-hidden rounded-xl border border-fuchsia-400/15 bg-[#061021] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-200/70">{title}</p><pre className="mt-3 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-fuchsia-50/75">{code}</pre></div>
}

const plotLayout = {
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(255,255,255,0.018)',
  font: { family: 'Inter, system-ui, sans-serif', color: '#cbd5e1', size: 11 },
  margin: { l: 44, r: 18, t: 18, b: 42 },
}

function InteractivePlot(props: any) {
  return <Suspense fallback={<div className="flex items-center justify-center rounded-lg border border-white/8 bg-white/[0.02] text-xs text-white/40" style={{ height: props.style?.height ?? '260px' }}>Loading interactive notebook plot...</div>}><Plot {...props} /></Suspense>
}

function StageResources({ title }: { title: string }) {
  const resources = methodologyResources[title]
  if (!resources) return null

  const stopNodeToggle = (event: React.SyntheticEvent) => event.stopPropagation()

  return (
    <section
      className="mt-5 border-t border-white/8 pt-5"
      data-artifact-action="true"
      onPointerDown={stopNodeToggle}
      onMouseDown={stopNodeToggle}
      onClick={stopNodeToggle}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><p className="section-label">Source artifacts</p><h4 className="mt-1 text-sm font-semibold text-white">Notebook and dataset audit trail</h4></div>
        <span className="text-[10px] text-white/40">Full source files are bundled with this deployment</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ArtifactList title="Notebook previews" items={resources.notebooks} kind="Notebook" />
        <ArtifactList title="Dataset previews" items={resources.datasets} kind="Dataset" />
      </div>
      {resources.preview && <figure className="mt-4 overflow-hidden rounded-xl border border-white/8 bg-[#10071d]/70 p-3"><img src={resources.preview.src} alt={resources.preview.alt} className="max-h-72 w-full rounded-lg object-contain" /><figcaption className="mt-2 text-xs text-white/45">{resources.preview.caption}</figcaption></figure>}
    </section>
  )
}

function ArtifactList({ title, items, kind }: { title: string; items: MethodologyArtifact[]; kind: 'Notebook' | 'Dataset' }) {
  const [preview, setPreview] = useState<{ label: string; content: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const stopCardToggle = (event: React.SyntheticEvent) => event.stopPropagation()
  const actionProps = {
    'data-artifact-action': 'true',
    onPointerDown: stopCardToggle,
    onMouseDown: stopCardToggle,
  }

  const previewArtifact = async (item: MethodologyArtifact, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setLoading(item.href)
    try {
      const raw = await fetch(item.href).then((response) => {
        if (!response.ok) throw new Error('Source file could not be loaded')
        return response.text()
      })
      let content = raw
      if (kind === 'Notebook') {
        try {
          const notebook = JSON.parse(raw)
          const cells = (notebook.cells ?? []).slice(0, 3).map((cell: { cell_type?: string; source?: string[] }) => `# ${cell.cell_type ?? 'cell'}\n${(cell.source ?? []).join('')}`).join('\n\n')
          content = cells || raw
        } catch {
          content = raw
        }
      }
      const lines = content.split('\n').slice(0, 18).join('\n')
      setPreview({ label: item.label, content: lines || 'This file has no text preview.' })
    } catch {
      setPreview({ label: item.label, content: 'Preview could not load. Use Download to retrieve the full source file.' })
    } finally {
      setLoading(null)
    }
  }

  const downloadArtifact = async (item: MethodologyArtifact, event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDownloading(item.href)
    try {
      const response = await fetch(item.href)
      if (!response.ok) throw new Error('Source file could not be loaded')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = item.label
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(item.href, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3" data-artifact-action="true" onClick={stopCardToggle}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200/75">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.href} className="rounded-lg border border-white/7 bg-white/[0.025] px-3 py-2.5">
            <b className="block text-xs text-white/82">{item.label}</b>
            <small className="mt-1 block text-[11px] leading-relaxed text-white/42">{item.note ?? `Full ${kind.toLowerCase()} source file`}</small>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                {...actionProps}
                onClick={(event) => previewArtifact(item, event)}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white/70 hover:border-fuchsia-400/35 hover:text-fuchsia-100"
              >
                {loading === item.href ? 'Loading...' : 'Preview here'}
              </button>
              <button
                type="button"
                {...actionProps}
                onClick={(event) => downloadArtifact(item, event)}
                className="rounded-md border border-fuchsia-400/25 bg-fuchsia-400/[0.08] px-2 py-1 text-[10px] font-semibold text-fuchsia-100 hover:border-fuchsia-300/50"
              >
                {downloading === item.href ? 'Preparing...' : 'Download file'}
              </button>
              <a
                {...actionProps}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={stopCardToggle}
                className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[10px] font-semibold text-white/62 hover:border-white/20 hover:text-white"
              >
                Open full file
              </a>
            </div>
          </div>
        ))}
      </div>
      {preview && (
        <div {...actionProps} onClick={stopCardToggle} className="mt-3 overflow-hidden rounded-lg border border-fuchsia-400/20 bg-[#10071d] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-200">Preview: {preview.label}</p>
            <button type="button" {...actionProps} onClick={(event) => { event.stopPropagation(); setPreview(null) }} className="text-xs text-white/45 hover:text-white">Close</button>
          </div>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-fuchsia-50/75">{preview.content}</pre>
        </div>
      )}
    </div>
  )
}

type EvidencePoint = { label: string; value: number }
type EvidenceMetric = { label: string; value: string; note: string }
type EvidenceConfig = {
  heading: string
  note: string
  chartType: 'bar' | 'line' | 'pie'
  chartTitle: string
  data: EvidencePoint[]
  metrics: EvidenceMetric[]
  code: string
  table?: Record<string, string | number>[]
}

const evidenceConfigs: Record<string, EvidenceConfig> = {
  'Data Collection': {
    heading: 'Source inventory from the notebook handoff',
    note: 'Counts are derived from the bundled generated datasets used by the HSEP pipeline.',
    chartType: 'bar',
    chartTitle: 'Records available by source artifact',
    data: datasetInventory,
    metrics: [
      { label: 'notebooks linked', value: '23', note: 'Development notebook folder' },
      { label: 'dataset files linked', value: '20', note: 'Generated dataset folder' },
      { label: 'taxonomy rows', value: '2,616', note: 'Skill dictionary source' },
    ],
    code: `notebooks = glob("Development Notebooks/*.ipynb")\ndatasets = glob("Generated Datasets/*")\ninventory = profile_files(notebooks, datasets)`,
  },
  'Data Cleaning & Normalization': {
    heading: 'Normalization and alias audit',
    note: 'The taxonomy dictionary is used to collapse noisy skill variants into canonical technical labels.',
    chartType: 'bar',
    chartTitle: 'Top classified technical categories',
    data: taxonomyCategoryCounts,
    metrics: [
      { label: 'dictionary rows', value: '2,616', note: 'raw taxonomy candidates' },
      { label: 'technical skills', value: '114', note: 'filtered technical master' },
      { label: 'top category', value: 'Software Eng.', note: '20 skills' },
    ],
    code: `ALIASES = {"node.js": "nodejs", "c#": "csharp", "c++": "cpp"}\ndf["skill_norm"] = df["skill"].str.lower().replace(ALIASES)\ndf = df.drop_duplicates("skill_norm")`,
  },
  'Skill Universe Expansion': {
    heading: 'Expanded skill universe coverage',
    note: 'The expanded master and taxonomy gold files preserve both discovered skills and manually recovered modern AI/analytics skills.',
    chartType: 'bar',
    chartTitle: 'Category coverage after expansion',
    data: taxonomyCategoryCounts,
    metrics: [
      { label: 'expanded skills', value: '114', note: 'expanded_skill_master.csv' },
      { label: 'curated gold rows', value: '247', note: 'taxonomy_gold_247.csv' },
      { label: 'strategic additions', value: 'LLM/RAG', note: 'manual modern-skill recovery' },
    ],
    code: `skill_universe = job_skill_mentions.value_counts()\nskill_universe = recover_strategic_terms(skill_universe, ["LangChain", "LLM", "RAG"])\nexpanded_master = classify_and_export(skill_universe)`,
  },
  'Skill Classification & Taxonomy': {
    heading: 'Taxonomy distribution',
    note: 'The classification notebook separates technical skills from noisy workforce phrases and assigns display-ready categories.',
    chartType: 'pie',
    chartTitle: 'Technical taxonomy split',
    data: taxonomyCategoryCounts,
    metrics: [
      { label: 'display categories', value: '8+', note: 'used by Skill Explorer filters' },
      { label: 'classified skills', value: '114', note: 'technical master rows' },
      { label: 'largest group', value: '20', note: 'Software Engineering' },
    ],
    code: `technical = taxonomy[taxonomy["sub_category"].notna()]\ntechnical = technical[technical["confidence"] >= 0.75]\ntechnical.to_csv("technical_skill_master.csv", index=False)`,
  },
  'Temporal Skill Intelligence': {
    heading: 'Historical demand reconstruction',
    note: 'The temporal notebooks rebuild multi-year demand observations from Stack Overflow signals.',
    chartType: 'line',
    chartTitle: 'Skill-year observations by year',
    data: historyYearCounts,
    metrics: [
      { label: 'history rows', value: '2,304', note: 'skill_demand_history_clean.csv' },
      { label: 'years covered', value: '2013-2025', note: '13 yearly snapshots' },
      { label: 'peak year', value: '2023', note: '306 observations' },
    ],
    code: `history = rebuild_yearly_skill_history(stackoverflow_surveys)\nhistory["adoption_rate"] = history["demand"] / history.groupby("year")["demand"].transform("sum")\nhistory.to_csv("skill_demand_history_clean.csv", index=False)`,
  },
  'Hybrid Forecasting': {
    heading: 'Forecast method selection',
    note: 'The forecasting notebook selects a method from history coverage, then emits multi-horizon forecasts and confidence.',
    chartType: 'pie',
    chartTitle: 'Forecast methods used',
    data: forecastMethodCounts,
    metrics: [
      { label: 'forecast rows', value: '114', note: 'forecast_results.csv' },
      { label: 'Holt models', value: '88', note: 'long-history skills' },
      { label: 'non-stable trends', value: '51', note: 'growing, declining, explosive' },
    ],
    code: `if history_length >= 10:\n    method = "Holt"\nelif history_length >= 7:\n    method = "ExponentialSmoothing"\nelse:\n    method = "FeatureBased"`,
    table: forecastTrendCounts.map((item) => ({ trend: item.label, skills: item.value })),
  },
  'SES Computation': {
    heading: 'Safety score and tier output',
    note: 'The SES notebook combines feature score, forecast intelligence, and cluster behavior into an interpretable safety tier.',
    chartType: 'bar',
    chartTitle: 'SES tier distribution',
    data: sesTierCounts,
    metrics: [
      { label: 'ranked skills', value: '114', note: 'ses_rankings.csv' },
      { label: 'safe or better', value: '81', note: 'Very Safe + Safe' },
      { label: 'top skill', value: 'Javascript', note: 'SES 0.767596' },
    ],
    code: `ses_score = (\n    0.55 * feature_score +\n    0.25 * forecast_intelligence +\n    0.20 * cluster_score\n)`,
    table: topSesRows.map((row) => ({ skill: row.skill, ses: row.ses.toFixed(3), method: row.method, trend: row.trend })),
  },
  'Industry Analytics': {
    heading: 'Industry-level aggregation proof',
    note: 'Industry analytics aggregate SES, demand, salary, growth, and forecast signals by domain.',
    chartType: 'bar',
    chartTitle: 'Average SES by industry',
    data: industryMetricRows.map((row) => ({ label: row.label, value: row.value })),
    metrics: [
      { label: 'industries', value: '8', note: 'industry_analytics.csv' },
      { label: 'highest avg SES', value: '0.423', note: 'Data Analytics' },
      { label: 'highest growth', value: '15.19%', note: 'AI/ML 3-year outlook' },
    ],
    code: `industry = skill_map.merge(ses_rankings, on="skill")\nindustry_metrics = industry.groupby("industry").agg(["mean", "count"])\nindustry_metrics.to_csv("industry_analytics.csv")`,
    table: industryMetricRows.slice(0, 5).map((row) => ({ industry: row.label, skills: row.skills, avg_ses: row.value, growth_3y_pct: row.growth })),
  },
  'Skill Ranking by Industry': {
    heading: 'Per-industry ranking inputs',
    note: 'The industry-skill map links each domain to the skills ranked and displayed across the Industries page.',
    chartType: 'bar',
    chartTitle: 'Skill mappings by industry',
    data: industrySkillCounts,
    metrics: [
      { label: 'mapped rows', value: '139', note: 'industry_skill_map.csv' },
      { label: 'largest map', value: '26', note: 'Software Engineering' },
      { label: 'smallest map', value: '10', note: 'Cybersecurity' },
    ],
    code: `ranked = industry_skill_map.merge(ses_rankings, on="skill")\nranked = ranked.sort_values(["industry", "ses_score"], ascending=[True, False])`,
  },
  'Career Recommendation': {
    heading: 'Recommendation knowledge base',
    note: 'The RAG knowledge notebook exports skill narratives and demo questions used for grounded recommendations.',
    chartType: 'pie',
    chartTitle: 'Knowledge base archetypes',
    data: knowledgeBaseArchetypes,
    metrics: [
      { label: 'knowledge docs', value: '114', note: 'skill_knowledge_base.json' },
      { label: 'demo prompts', value: '3', note: 'career_advisor_demo.json' },
      { label: 'largest archetype', value: 'Growing', note: '55 knowledge docs' },
    ],
    code: `docs = build_skill_documents(ses_rankings, forecasts, industry_map)\nretriever = keyword_or_faiss_retriever(docs)\nrecommendations = rank_skill_gaps(user_profile, docs)`,
    table: advisorDemoPrompts.map((prompt, index) => ({ '#': index + 1, prompt })),
  },
  'AI Career Advisor': {
    heading: 'Advisor retrieval and grounding',
    note: 'The advisor notebook shows retrieval-first responses: user questions are answered from HSEP skill context before model generation.',
    chartType: 'bar',
    chartTitle: 'Advisor context by archetype',
    data: knowledgeBaseArchetypes,
    metrics: [
      { label: 'retrieval docs', value: '114', note: 'local knowledge base' },
      { label: 'API key status', value: 'env only', note: 'public copies redacted' },
      { label: 'fallback mode', value: 'keyword', note: 'works without FAISS/API' },
    ],
    code: `context = retrieve_relevant_skills(question, k=6)\nmessages = [SYSTEM_PROMPT, format_context(context), question]\nanswer = call_openrouter(messages) if api_key else local_grounded_answer(context)`,
    table: advisorDemoPrompts.map((prompt, index) => ({ scenario: `Demo ${index + 1}`, prompt })),
  },
  'Explainability Layer': {
    heading: 'Score explanation ingredients',
    note: 'Explainability uses feature values, forecast confidence, cluster/archetype behavior, and industry context.',
    chartType: 'bar',
    chartTitle: 'Average normalized feature signals',
    data: featureAverages,
    metrics: [
      { label: 'feature signals', value: '6', note: 'master_skill_dataset_v9.csv' },
      { label: 'explain rows', value: '114', note: 'one per ranked skill' },
      { label: 'score outputs', value: '3 parts', note: 'feature, forecast, cluster' },
    ],
    code: `explanation = {\n  "feature_contributions": feature_values * feature_weights,\n  "forecast_meta": {method, trend, confidence},\n  "cluster_context": {archetype, cluster_score},\n}`,
  },
  'Dashboard & Website Output': {
    heading: 'Website data products',
    note: 'The frontend pages are powered by the same processed CSV outputs shown in the notebook audit trail.',
    chartType: 'bar',
    chartTitle: 'Primary rows behind the interface',
    data: datasetInventory,
    metrics: [
      { label: 'major app pages', value: '8', note: 'dashboard through methodology' },
      { label: 'export decks', value: '6', note: 'reports center outputs' },
      { label: 'static-safe docs', value: '43+', note: 'notebooks, CSVs, previews' },
    ],
    code: `dashboard_data = {\n  "skills": ses_rankings,\n  "forecasts": forecast_results,\n  "industries": industry_analytics,\n  "advisor": skill_knowledge_base,\n}`,
  },
}

const plotColors = ['#c084fc', '#a78bfa', '#f472b6', '#f59e0b', '#2dd4bf', '#818cf8', '#fb7185', '#34d399']

function EvidenceTable({ rows }: { rows: Record<string, string | number>[] }) {
  if (!rows.length) return null
  const columns = Object.keys(rows[0])
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.025]">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/[0.035] text-[10px] uppercase tracking-[0.14em] text-white/35">
          <tr>{columns.map((column) => <th key={column} className="px-3 py-2">{column.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/6 text-white/60">
          {rows.map((row, index) => (
            <tr key={index}>{columns.map((column) => <td key={column} className="px-3 py-2">{row[column]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GenericStageEvidence({ config }: { config: EvidenceConfig }) {
  const labels = config.data.map((item) => item.label)
  const values = config.data.map((item) => item.value)
  const plotData =
    config.chartType === 'pie'
      ? [{ type: 'pie', labels, values, hole: 0.45, marker: { colors: plotColors }, textinfo: 'label+percent', hovertemplate: '%{label}<br>%{value}<extra></extra>' }]
      : config.chartType === 'line'
        ? [{ type: 'scatter', mode: 'lines+markers', x: labels, y: values, line: { color: '#c084fc', width: 3 }, marker: { color: '#f0abfc', size: 7 }, fill: 'tozeroy', fillcolor: 'rgba(192,132,252,0.12)', hovertemplate: '%{x}<br>%{y}<extra></extra>' }]
        : [{ type: 'bar', orientation: 'h', x: values, y: labels, marker: { color: values.map((_, index) => plotColors[index % plotColors.length]) }, hovertemplate: '%{y}<br>%{x}<extra></extra>' }]

  return (
    <div className="mt-5 border-t border-white/8 pt-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div><p className="section-label">Interactive notebook evidence</p><h4 className="mt-1 text-sm font-semibold text-white">{config.heading}</h4></div>
        <span className="text-[10px] text-white/40">{config.note}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 overflow-visible rounded-xl border border-white/8 bg-[#10071d]/70 p-2">
          <InteractivePlot
            data={plotData as any}
            layout={{
              ...plotLayout,
              height: 285,
              title: { text: config.chartTitle, font: { size: 12, color: '#f5d0fe' } },
              margin: { l: config.chartType === 'bar' ? 138 : 44, r: 18, t: 42, b: 42 },
              xaxis: { gridcolor: 'rgba(255,255,255,0.08)', zerolinecolor: 'rgba(255,255,255,0.12)' },
              yaxis: { automargin: true, gridcolor: 'rgba(255,255,255,0.04)' },
              showlegend: config.chartType === 'pie',
            } as any}
            config={{ responsive: true, displaylogo: false, scrollZoom: false }}
            useResizeHandler
            style={{ width: '100%', height: '285px' }}
          />
        </div>
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            {config.metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/35">{metric.label}</p>
                <b className="mt-1 block text-lg text-fuchsia-100">{metric.value}</b>
                <span className="mt-1 block text-[11px] text-white/38">{metric.note}</span>
              </div>
            ))}
          </div>
          {config.table && <EvidenceTable rows={config.table} />}
        </div>
      </div>
      <div className="mt-4">
        <CodeSnapshot title="Notebook logic preview" code={config.code} />
      </div>
    </div>
  )
}

function StageEvidence({ title }: { title: string }) {
  if (title === 'Feature Engineering') {
    const labels = evidenceFeatures.map((feature) => feature.replace(/_/g, ' '))
    return <div className="mt-5 border-t border-white/8 pt-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="section-label">Notebook evidence</p><h4 className="mt-1 text-sm font-semibold text-white">Feature correlation matrix</h4></div><span className="text-[10px] text-white/40">Hover cells to inspect exact correlation</span></div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="min-w-0 overflow-visible rounded-xl border border-white/8 bg-[#10071d]/70 p-2">
          <InteractivePlot
            data={[{ type: 'heatmap', z: featureCorrelation, x: labels, y: labels, zmin: -1, zmax: 1, colorscale: 'RdBu', reversescale: true, hovertemplate: '%{y} vs %{x}<br>Correlation: %{z:.3f}<extra></extra>', colorbar: { title: { text: 'r', font: { color: '#cbd5e1' } }, tickfont: { color: '#94a3b8' } } }] as any}
            layout={{ ...plotLayout, height: 310, xaxis: { tickfont: { size: 9 }, side: 'bottom', automargin: true }, yaxis: { tickfont: { size: 9 }, automargin: true } } as any}
            config={{ responsive: true, displaylogo: false, scrollZoom: false }}
            useResizeHandler
            style={{ width: '100%', height: '310px' }}
          />
        </div>
        <CodeSnapshot title="Original correlation setup" code={`feature_cols = [\n  'linkedin_demand', 'salary_premium',\n  'current_usage', 'future_interest',\n  'global_adoption_score', 'growth_rate'\n]\nsns.heatmap(df[feature_cols].corr(), annot=True)`} />
      </div>
    </div>
  }

  if (title === 'Skill Archetype Discovery') {
    const colors = ['#c084fc', '#a78bfa', '#f59e0b', '#2dd4bf']
    const traces = [0, 1, 2, 3].map((cluster) => {
      const points = clusterPoints.filter((point) => point.cluster === cluster)
      return { type: 'scattergl', mode: 'markers', name: points[0]?.archetype ?? `Cluster ${cluster}`, x: points.map((point) => point.x), y: points.map((point) => point.y), text: points.map((point) => point.skill), marker: { color: colors[cluster], size: 9, opacity: 0.82, line: { color: '#f8fafc', width: 0.4 } }, hovertemplate: '%{text}<br>PC1: %{x:.2f}<br>PC2: %{y:.2f}<extra>%{fullData.name}</extra>' }
    })
    return <div className="mt-5 border-t border-white/8 pt-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><p className="section-label">Notebook evidence</p><h4 className="mt-1 text-sm font-semibold text-white">Interactive clustering diagnostics</h4></div><span className="text-[10px] text-white/40">Original v8 notebook run: 114 skills</span></div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="min-w-0 overflow-visible rounded-xl border border-white/8 bg-[#10071d]/70 p-2">
          <InteractivePlot
            data={traces as any}
            layout={{ ...plotLayout, height: 330, legend: { orientation: 'h', y: -0.2 }, xaxis: { title: { text: 'Principal Component 1' }, gridcolor: 'rgba(255,255,255,0.08)', zerolinecolor: 'rgba(255,255,255,0.16)' }, yaxis: { title: { text: 'Principal Component 2' }, gridcolor: 'rgba(255,255,255,0.08)', zerolinecolor: 'rgba(255,255,255,0.16)' }, hovermode: 'closest' } as any}
            config={{ responsive: true, displaylogo: false, scrollZoom: false }}
            useResizeHandler
            style={{ width: '100%', height: '330px' }}
          />
        </div>
        <div className="space-y-4">
          <div className="min-w-0 overflow-visible rounded-xl border border-white/8 bg-[#10071d]/70 p-2">
            <InteractivePlot
              data={[{ type: 'bar', x: silhouetteScores.map((item) => `K=${item.k}`), y: silhouetteScores.map((item) => item.score), marker: { color: silhouetteScores.map((item) => item.k === 2 ? '#2dd4bf' : '#64748b') }, hovertemplate: '%{x}<br>Silhouette: %{y:.6f}<extra></extra>' }] as any}
              layout={{ ...plotLayout, height: 205, margin: { l: 42, r: 12, t: 18, b: 38 }, yaxis: { title: { text: 'Score' }, range: [0, 0.42], gridcolor: 'rgba(255,255,255,0.08)' }, xaxis: { tickfont: { size: 9 } } } as any}
              config={{ responsive: true, displaylogo: false }}
              useResizeHandler
              style={{ width: '100%', height: '205px' }}
            />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs leading-relaxed text-white/55"><b className="text-white">Silhouette outcome:</b> K=2 had the highest raw silhouette score (0.378971). The final notebook intentionally retained K=4 to support the four interpretable HSEP archetypes.</div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CodeSnapshot title="Original K-Means sweep" code={`scores = []\nfor k in range(2, 11):\n    labels = KMeans(n_clusters=k, random_state=42, n_init=20).fit_predict(X_scaled)\n    scores.append(silhouette_score(X_scaled, labels))`} />
        <CodeSnapshot title="Original PCA projection" code={`pca = PCA(n_components=2)\ncomponents = pca.fit_transform(X_scaled)\ndf['pc1'], df['pc2'] = components[:, 0], components[:, 1]\ndf['cluster'] = kmeans.fit_predict(X_scaled)`} />
      </div>
    </div>
  }

  const config = evidenceConfigs[title]
  return config ? <GenericStageEvidence config={config} /> : null
}

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
  const hasEvidence = Boolean(evidenceConfigs[stage.title]) || stage.title === 'Feature Engineering' || stage.title === 'Skill Archetype Discovery'
  const toggleExpanded = () => setExpanded((current) => !current)

  return (
    <div className="hsep-flowchart__node-wrapper">
      {/* â”€â”€ Connector line + dot â”€â”€ */}
      <div className="hsep-flowchart__rail">
        <div
          className="hsep-flowchart__dot"
          style={{ boxShadow: `0 0 12px ${stage.glow}, 0 0 24px ${stage.glow}` }}
        >
          <div className={`hsep-flowchart__dot-inner bg-gradient-to-br ${stage.color}`} />
        </div>
        {!isLast && <div className="hsep-flowchart__connector" />}
      </div>

      {/* â”€â”€ Node Card â”€â”€ */}
      <div
        className={`hsep-flowchart__card group ${expanded ? 'hsep-flowchart__card--expanded' : ''}`}
      >
        {/* Header row */}
        <div
          className="relative z-[1] flex cursor-pointer items-start gap-3"
          role="button"
          tabIndex={0}
          onClick={toggleExpanded}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleExpanded()
            }
          }}
        >
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
            {hasEvidence && <span className="mt-1 inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-fuchsia-100">Interactive notebook evidence</span>}
          </div>
          <button
            type="button"
            className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition-all group-hover:border-white/20 group-hover:text-white/60"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={(event) => {
              event.stopPropagation()
              toggleExpanded()
            }}
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

        {expanded && <><StageResources title={stage.title} /><StageEvidence title={stage.title} /></>}
      </div>
    </div>
  )
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• INPUT / OUTPUT BLOCK â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
          ? 'border-fuchsia-400/15 bg-fuchsia-400/[0.04]'
          : 'border-violet-400/15 bg-violet-400/[0.04]'
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wider ${
          isInput ? 'text-fuchsia-300/60' : 'text-violet-300/60'
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

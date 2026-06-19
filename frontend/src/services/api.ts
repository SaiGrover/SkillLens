/**
 * SkillLens AI v4 — Typed API Client
 * Advisor types updated for 14_Career_Advisor.ipynb:
 *   - OpenRouter (gpt-oss-120b) instead of Anthropic
 *   - FAISS + keyword retrieval
 *   - SkillReference matches knowledge-base document schema
 */

import { fallbackApiResponse } from "@/data/fallbackData"

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000"

function markCsvSnapshotMode() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent("skilllens:data-source", { detail: "csv-snapshot" }))
}

// ── Generic fetch wrapper ────────────────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token")
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const fallback = fallbackApiResponse(path)
      if (fallback !== undefined) {
        markCsvSnapshotMode()
        return fallback as T
      }

      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail ?? `API error ${res.status}`)
    }
    return res.json()
  } catch (error) {
    const fallback = fallbackApiResponse(path)
    if (fallback !== undefined) {
      markCsvSnapshotMode()
      return fallback as T
    }
    throw error
  }
}

// ── Skill types ───────────────────────────────────────────────────────────────

export interface SkillSummary {
  id: string
  name: string
  category?: string
  lifecycle?: string
  ses_score?: number
  ses_tier?: string
  archetype?: string
  growth_rate?: number
  linkedin_demand?: number
  salary_premium?: number
  forecast_1y?: number
  forecast_trend?: string
  forecast_method?: string
}

export interface SkillDetail extends SkillSummary {
  subcategory?: string
  description?: string
  current_usage?: number
  future_interest?: number
  global_adoption?: number
  momentum_score?: number
  volatility_score?: number
  growth_consistency?: number
  cagr?: number
  trend_slope?: number
  feature_score?: number
  forecast_score?: number
  cluster_score?: number
  ses_delta_30d?: number
  cluster_id?: number
  pca_x?: number
  pca_y?: number
  forecast_2y?: number
  forecast_3y?: number
  forecast_score_1y?: number
  forecast_score_2y?: number
  forecast_score_3y?: number
  forecast_score_composite?: number
  confidence?: number
  history_length?: number
}

export interface PaginatedSkills {
  items: SkillSummary[]
  total: number
  page: number
  pages: number
  per_page: number
}

// ── SES types ─────────────────────────────────────────────────────────────────

export interface SESRankEntry {
  rank: number
  skill_id: string
  skill_name: string
  ses_score: number
  ses_tier: string
  feature_score: number
  forecast_score: number
  cluster_score: number
  archetype?: string
  forecast_trend?: string
  forecast_method?: string
  ses_delta_30d?: number
}

export interface SESDistribution {
  tier: string
  count: number
  percentage: number
  avg_ses: number
}

export interface SESExplainability {
  skill_id: string
  skill_name: string
  ses_score: number
  ses_tier: string
  breakdown: Record<string, number>
  feature_contributions: Record<string, number>
  forecast_meta: {
    method?: string
    trend?: string
    confidence?: number
    history_length?: number
    forecast_score_1y?: number
    forecast_score_2y?: number
    forecast_score_3y?: number
  }
  narrative: string
}

// ── Forecast types ─────────────────────────────────────────────────────────────

export interface SkillForecastResponse {
  skill_id: string
  skill_name: string
  history: { year: number; demand: number; adoption_rate: number }[]
  forecast_1y?: number
  forecast_2y?: number
  forecast_3y?: number
  forecast_score_1y?: number
  forecast_score_2y?: number
  forecast_score_3y?: number
  forecast_score?: number
  forecast_method?: string
  forecast_trend?: string
  confidence?: number
  history_length?: number
  archetype?: string
}

export interface ComparisonResponse {
  skills: SkillForecastResponse[]
}

export interface LeaderboardEntry {
  skill_id: string
  skill_name: string
  forecast_3y: number
  forecast_1y: number
  growth_pct: number
  forecast_trend: string
  forecast_method: string
  confidence: number
}

export interface MethodDistribution {
  method: string
  count: number
  avg_confidence: number
  description: string
}

// ── Cluster types ──────────────────────────────────────────────────────────────

export interface ClusterPoint {
  skill_id: string
  skill_name: string
  cluster_id: number
  archetype: string
  pca_x: number
  pca_y: number
  ses_score?: number
  category?: string
}

export interface ClusterSummary {
  cluster_id: number
  archetype: string
  count: number
  avg_ses: number
  avg_silhouette: number
  centroid_x: number
  centroid_y: number
  representative_skills: string[]
  description: string
}

// ── Career types ───────────────────────────────────────────────────────────────

export interface RoadmapStep {
  skill_id: string
  skill_name: string
  priority: number
  ses_score?: number
  ses_tier?: string
  forecast_growth_pct?: number
  forecast_trend?: string
  forecast_method?: string
  salary_premium?: number
  estimated_weeks: number
  difficulty: string
  roi_score: number
  archetype?: string
}

export interface GapAnalysis {
  current_role: string
  target_role: string
  current_skills: string[]
  missing_skills: string[]
  already_have: string[]
  roadmap: RoadmapStep[]
  total_weeks: number
  avg_ses_improvement: number
  target_role_stability?: number
  summary: string
}

// ── Advisor types (updated for 14_Career_Advisor.ipynb) ───────────────────────

/**
 * Skill reference card returned alongside the LLM reply.
 * Fields match skill_knowledge_base.json document schema.
 */
export interface SkillReference {
  skill: string
  ses_score?: number
  ses_tier?: string
  archetype?: string
  forecast_trend?: string    // Explosive | Growing | Stable | Declining
  forecast_1y?: number
  forecast_3y?: number
  sub_category?: string
}

export interface AdvisorResponse {
  reply: string
  retrieved_skills: string[]           // ordered list of skill names retrieved
  skill_references: SkillReference[]   // rich cards for each retrieved skill
  anchor_skill?: string                // skill name detected in the query (or null)
  query_type: string                   // comparison | recommendation | roadmap | etc.
}

export interface AdvisorStatusResponse {
  knowledge_base_loaded: boolean
  skill_count: number
  faiss_available: boolean
  retriever: "FAISS" | "keyword"
  model: string
  openrouter_key_set: boolean
}

// ── Industry & Global types ────────────────────────────────────────────────────

export interface IndustrySummary {
  id: string
  name: string
  icon?: string
  growth_rate?: number
  hiring_index?: number
  avg_ses?: number
  extinction_risk?: number
  forecast?: string
  top_skills?: string[]
  skill_count?: number
}

export interface RegionData {
  region: string
  demand_index: number
  growth_index: number
  risk_index: number
  avg_salary_usd: number
  top_skills: string[]
  emerging_skills: string[]
  job_postings_k: number
}

// ── Pipeline stats ─────────────────────────────────────────────────────────────

export interface PipelineStats {
  total_skills: number
  history_records: number
  forecast_records: number
  forecast_accuracy_pct: number
  survey_years_covered: number
  job_postings_processed: number
  archetype_distribution: Record<string, number>
  ses_tier_distribution: Record<string, number>
}

// ═══════════════════════════════════════════════════════════════════════════════
// API service objects
// ═══════════════════════════════════════════════════════════════════════════════

// ── Skills ─────────────────────────────────────────────────────────────────────

export const skillsApi = {
  list: (params: {
    q?: string; category?: string; archetype?: string; lifecycle?: string
    forecast_trend?: string; forecast_method?: string
    min_ses?: number; max_ses?: number; min_growth?: number
    sort_by?: string; sort_dir?: string; page?: number; per_page?: number
  }) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => [k, String(v)])
    )
    return api<PaginatedSkills>(`/api/skills?${qs}`)
  },
  get:            (id: string)    => api<SkillDetail>(`/api/skills/${id}`),
  history:        (id: string)    => api<{ year: number; adoption_rate: number; demand: number }[]>(`/api/skills/${id}/history`),
  similar:        (id: string)    => api<{ id: string; name: string; ses_score?: number }[]>(`/api/skills/${id}/similar`),
  categories:     ()              => api<string[]>("/api/skills/categories"),
  topRising:      (limit = 10)   => api<SkillSummary[]>(`/api/skills/top-rising?limit=${limit}`),
  extinctionRisk: (limit = 10)   => api<SkillSummary[]>(`/api/skills/extinction-risk?limit=${limit}`),
}

// ── SES ────────────────────────────────────────────────────────────────────────

export const sesApi = {
  rankings: (params?: { limit?: number; offset?: number; tier?: string; archetype?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )
    return api<SESRankEntry[]>(`/api/ses/rankings?${qs}`)
  },
  distribution: () => api<SESDistribution[]>("/api/ses/distribution"),
  explain:      (skillId: string) => api<SESExplainability>(`/api/ses/explain/${skillId}`),
  heatmap:      () => api<{ category: string; tier: string; count: number; avg_ses: number }[]>("/api/ses/heatmap"),
}

// ── Forecasting ────────────────────────────────────────────────────────────────

export const forecastApi = {
  get:     (skillId: string) => api<SkillForecastResponse>(`/api/forecasting/${skillId}`),
  compare: (skillIds: string[]) =>
    api<ComparisonResponse>(`/api/forecasting/compare/skills?skill_ids=${skillIds.join(",")}`),
  futureProofLeaderboard: (limit = 10, trend?: string) => {
    const qs = new URLSearchParams({ limit: String(limit) })
    if (trend) qs.set("trend", trend)
    return api<LeaderboardEntry[]>(`/api/forecasting/leaderboard/future-proof?${qs}`)
  },
  methodDistribution: () => api<MethodDistribution[]>("/api/forecasting/method/distribution"),
  trendDistribution:  () => api<{ trend: string; count: number; avg_forecast_score: number }[]>("/api/forecasting/trend/distribution"),
}

// ── Clustering ─────────────────────────────────────────────────────────────────

export const clusterApi = {
  map: (params?: { archetype?: string; category?: string; limit?: number }) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
    )
    return api<ClusterPoint[]>(`/api/clustering/map?${qs}`)
  },
  summary:    () => api<ClusterSummary[]>("/api/clustering/summary"),
  silhouette: () => api<{ global_silhouette: number; interpretation: string }>("/api/clustering/silhouette"),
}

// ── Career ─────────────────────────────────────────────────────────────────────

export const careerApi = {
  roles: () => api<string[]>("/api/career/roles"),
  gapAnalysis: (currentRole: string, targetRole: string) =>
    api<GapAnalysis>(
      `/api/career/gap-analysis?current_role=${currentRole}&target_role=${targetRole}`,
      { method: "POST" }
    ),
  stability: (roleId: string) =>
    api<{ role: string; stability_score: number; at_risk_skills: string[]; recommendation: string }>(
      `/api/career/stability/${roleId}`
    ),
}

// ── Industries ─────────────────────────────────────────────────────────────────

export const industriesApi = {
  list:   ()           => api<IndustrySummary[]>("/api/industries"),
  get:    (id: string) => api<IndustrySummary>(`/api/industries/${id}`),
  skills: (id: string) =>
    api<{ id: string; name: string; ses_score?: number; ses_tier?: string }[]>(
      `/api/industries/${id}/skills`
    ),
}

// ── Global ─────────────────────────────────────────────────────────────────────

export const globalApi = {
  all:              () => api<RegionData[]>("/api/global"),
  growthLeaderboard: () => api<RegionData[]>("/api/global/leaderboard/growth"),
}

// ── Advisor (OpenRouter + FAISS RAG) ──────────────────────────────────────────

export const advisorApi = {
  /**
   * Send a career question. Optionally pass conversation history for multi-turn.
   * Returns LLM reply + retrieved skill reference cards.
   */
  chat: (
    message: string,
    history: { role: string; content: string }[] = [],
  ) =>
    api<AdvisorResponse>("/api/advisor", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),

  /** Check if knowledge base and FAISS index are loaded. */
  status: () => api<AdvisorStatusResponse>("/api/advisor/status"),
}

// ── Approach ───────────────────────────────────────────────────────────────────

export const approachApi = {
  stats:  () => api<PipelineStats>("/api/approach/stats"),
  models: () =>
    api<{
      ensemble_mape: number
      ensemble_accuracy_pct: number
      model_weights: Record<string, number>
    }>("/api/approach/models"),
}

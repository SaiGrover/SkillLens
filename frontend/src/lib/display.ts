export function normalizedKey(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function formatSkillName(name?: string) {
  const value = name ?? ''
  const key = normalizedKey(value)
  if (key === 'javascript') return 'JavaScript'
  if (key === 'matlab') return 'MATLAB'
  if (key === 'pytorch') return 'PyTorch'
  if (key === 'tensorflow') return 'TensorFlow'
  if (key === 'github') return 'GitHub'
  if (key === 'gitlab') return 'GitLab'
  return value
}

export function formatCategoryLabel(category?: string) {
  const key = normalizedKey(category)
  if (!key) return 'Unassigned'
  if (key === 'all') return 'All'
  if (key === 'all_skills') return 'All Skills'
  if (key === 'ai_ml' || key === 'ai_and_ml') return 'AI/ML'
  if (key === 'cloud_devops' || key === 'cloud_and_devops') return 'Cloud & DevOps'
  if (key === 'tools_platforms') return 'Tools & Platforms'
  if (key === 'engineering_systems' || key === 'systems_engineering') return 'Systems Engineering'
  if (key === 'data_analytics') return 'Data Analytics'
  if (key === 'data_engineering') return 'Data Engineering'
  if (key === 'data_science') return 'Data Science'
  if (key === 'software_engineering') return 'Software Engineering'
  return category ?? 'Unassigned'
}

export function categoryMatches(left?: string, right?: string) {
  return normalizedKey(left) === normalizedKey(right)
}

export function formatForecastGrowth(from?: number, to?: number) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0
  const base = Math.max(Math.abs(from ?? 0), 1)
  return Math.round((((to ?? 0) - (from ?? 0)) / base) * 1000) / 10
}

export function forecastTrendFromGrowth(growthPct: number) {
  if (growthPct <= -0.5) return 'Declining'
  if (growthPct >= 25) return 'Explosive'
  if (growthPct >= 0.5) return 'Growing'
  return 'Stable'
}

export function formatForecastMethod(method?: string) {
  if (!method) return 'Feature-Based Projection'
  if (method === 'Holt') return 'Holt Trend'
  if (method === 'ExponentialSmoothing') return 'Exponential Smoothing'
  if (method === 'FeatureBased') return 'Feature-Based Projection'
  if (method === 'GrowthAnchoredOverride') return 'Growth-Anchored Override'
  return method
}

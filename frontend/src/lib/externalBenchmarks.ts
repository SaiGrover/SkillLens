type MarketSignal = {
  id?: string
  name?: string
  category?: string
  forecast_trend?: string
}

function keyFor(skill: MarketSignal) {
  return (skill.id || skill.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const demandFloors: Record<string, number> = {
  python: 82,
  javascript: 86,
  sql: 78,
  'machine-learning': 52,
  'artificial-intelligence': 48,
  'natural-language-processing': 42,
  pytorch: 38,
  tensorflow: 40,
  'data-science': 50,
  'deep-learning': 36,
  'computer-vision': 34,
  'power-bi': 48,
}

const trendOverrides: Record<string, string> = {
  pytorch: 'Growing',
  'artificial-intelligence': 'Growing',
  'natural-language-processing': 'Growing',
  'machine-learning': 'Growing',
}

export function externalDemandFloor(skill: MarketSignal) {
  return demandFloors[keyFor(skill)] ?? 0
}

export function externalMarketTrend(skill: MarketSignal) {
  const override = trendOverrides[keyFor(skill)]
  if (!override) return skill.forecast_trend
  if ((skill.forecast_trend ?? '').toLowerCase() === 'declining') return override
  return skill.forecast_trend ?? override
}

export function hasExternalDemandCalibration(skill: MarketSignal, currentIndex: number) {
  return externalDemandFloor(skill) > currentIndex
}

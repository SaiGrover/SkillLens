import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { externalDemandFloor } from '@/lib/externalBenchmarks'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSalary(n: number) {
  return '$' + (n / 1000).toFixed(0) + 'k'
}

export function getRiskColor(risk: number) {
  if (risk <= 10) return 'text-emerald-400'
  if (risk <= 20) return 'text-yellow-400'
  return 'text-red-400'
}

export function getDemandColor(demand: number) {
  if (demand >= 85) return 'text-emerald-400'
  if (demand >= 65) return 'text-fuchsia-400'
  return 'text-yellow-400'
}

type DemandSignal = {
  linkedin_demand?: number
  current_usage?: number
  future_interest?: number
  forecast_score?: number
  forecast_score_composite?: number
  growth_rate?: number
  forecast_trend?: string
}

export function boundedIndex(value: number) {
  return Math.round(Math.max(0, Math.min(100, value)))
}

export function rawLinkedInDemandIndex(skill: DemandSignal) {
  return boundedIndex((skill.linkedin_demand ?? 0) * 100)
}

export function skillDemandIndex(skill: DemandSignal) {
  const linkedin = rawLinkedInDemandIndex(skill)
  const usage = (skill.current_usage ?? 0) * 100
  const interest = (skill.future_interest ?? 0) * 100
  const forecast = ((skill.forecast_score_composite ?? skill.forecast_score) ?? 0) * 100
  const growth = Math.min(100, Math.max(0, (skill.growth_rate ?? 0) * 100))
  const trend = (skill.forecast_trend ?? '').toLowerCase()
  const trendAdjustment = trend.includes('declin') ? -8 : trend.includes('explosive') ? 10 : trend.includes('grow') ? 5 : 0

  const internalIndex = boundedIndex(linkedin * 0.35 + usage * 0.2 + interest * 0.25 + forecast * 0.1 + growth * 0.1 + trendAdjustment)
  return Math.max(internalIndex, externalDemandFloor(skill as DemandSignal & { name: string }))
}

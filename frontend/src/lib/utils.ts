import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
  if (demand >= 65) return 'text-cyan-400'
  return 'text-yellow-400'
}

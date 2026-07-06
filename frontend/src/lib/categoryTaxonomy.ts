import { formatCategoryLabel, normalizedKey } from './display'

export type CategoryChip = {
  label: string
  values: string[]
}

export const productCategoryChips: CategoryChip[] = [
  { label: 'All Skills', values: ['All'] },
  { label: 'AI/ML', values: ['AI/ML', 'AI_ML', 'AI / ML'] },
  { label: 'Cloud & DevOps', values: ['Cloud & DevOps', 'Cloud', 'DevOps'] },
  { label: 'Cybersecurity', values: ['Cybersecurity'] },
  { label: 'Data Analytics', values: ['Data Analytics'] },
  { label: 'Data Engineering', values: ['Data Engineering'] },
  { label: 'Data Science', values: ['Data Science'] },
  { label: 'Database', values: ['Database'] },
  { label: 'Software Engineering', values: ['Software Engineering', 'Programming'] },
  { label: 'Systems Engineering', values: ['Systems Engineering', 'Engineering Systems', 'Engineering_Systems'] },
  { label: 'Tools & Platforms', values: ['Tools & Platforms', 'Tools_Platforms'] },
]

export function categoryLabelFor(category?: string) {
  const formatted = formatCategoryLabel(category)
  const canonical = productCategoryChips.find((chip) => chip.values.some((value) => normalizedKey(value) === normalizedKey(formatted)))
  return canonical?.label ?? formatted
}

export function matchesProductCategory(category: string | undefined, selected: string) {
  if (selected === 'All' || selected === 'All Skills') return true
  const chip = productCategoryChips.find((item) => normalizedKey(item.label) === normalizedKey(selected))
  if (chip) return chip.values.some((value) => normalizedKey(value) === normalizedKey(category) || normalizedKey(value) === normalizedKey(formatCategoryLabel(category)))
  return normalizedKey(selected) === normalizedKey(category) || normalizedKey(selected) === normalizedKey(formatCategoryLabel(category))
}

export function orderedCategoryLabels(labels: string[]) {
  const order = new Map(productCategoryChips.map((chip, index) => [normalizedKey(chip.label), index]))
  return [...labels].sort((left, right) => {
    const leftOrder = order.get(normalizedKey(left)) ?? Number.MAX_SAFE_INTEGER
    const rightOrder = order.get(normalizedKey(right)) ?? Number.MAX_SAFE_INTEGER
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return left.localeCompare(right)
  })
}

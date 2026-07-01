import type { SkillSummary } from '@/services/api'

const noisyUmbrellaSkillNames = new Set([
  'api',
  'apis',
  'coding',
  'database',
  'database management',
  'databases',
  'information technology',
  'programming',
  'programming languages',
  'testing',
])

function normalizeSkillToken(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function isNoisyUmbrellaSkill(skill: Pick<SkillSummary, 'id' | 'name'>) {
  const name = normalizeSkillToken(skill.name)
  const id = normalizeSkillToken(skill.id)
  return noisyUmbrellaSkillNames.has(name) || noisyUmbrellaSkillNames.has(id)
}

export function filterUserFacingSkills<T extends Pick<SkillSummary, 'id' | 'name'>>(skills: T[]) {
  return skills.filter((skill) => !isNoisyUmbrellaSkill(skill))
}

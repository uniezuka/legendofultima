// Ability definitions for monster skills — see docs/MONSTER_ABILITIES_SPEC.md.
// ABILITY_DESCRIPTIONS is client-only display text, no server equivalent.
// Skill id (MonsterTemplate.skills[0]) is the lookup key for both.
import { MONSTER_TEMPLATES } from './monsters'

export type { AbilityKind, AbilityDefinition } from '../../shared/types'
export { ABILITY_DEFINITIONS } from '../../shared/abilities'

// Static display text shown in the side panel next to the "Use Ability" button.
export const ABILITY_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  create_path: { label: 'Create Path', description: 'Creates a friendly path tile on an adjacent empty cell.' },
  destroy_path: { label: 'Destroy Path', description: 'Destroys an adjacent path tile (friendly or enemy) if unoccupied.' },
}

export function getMonsterSkillId(monsterType: string): string | null {
  return MONSTER_TEMPLATES[monsterType]?.skills?.[0] ?? null
}

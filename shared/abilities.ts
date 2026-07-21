// Ability definitions for monster skills — see docs/MONSTER_ABILITIES_SPEC.md.
// Skill id (MonsterTemplate.skills[0]) is the lookup key.

import type { AbilityDefinition } from './types'

// Range is fixed at 1 (orthogonal adjacency) for both abilities, independent
// of the monster's attack `range` stat.
export const ABILITY_DEFINITIONS: Record<string, AbilityDefinition> = {
  create_path: { range: 1, kind: 'create_path' },
  destroy_path: { range: 1, kind: 'destroy_path' },
}

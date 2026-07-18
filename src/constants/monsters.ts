export { MONSTER_TEMPLATES } from '../../shared/constants'

// Controls display order in the in-match summon roster (SidePanel/MonsterRoster) and the
// Campaign AI's affordable-summon list. Deliberately stays at the 5 free starters — the
// active summon roster is filtered to the player's loadout in Phase IV, not this constant.
export const MONSTER_TYPE_ORDER: string[] = ['slime', 'goblin', 'archer', 'knight', 'dragon']

// Shop-only monster types, purchasable but not summonable until added to a loadout.
export const SHOP_MONSTER_TYPES: string[] = ['white_mage', 'black_mage']

// Full registry — used by the Shop screen (Phase V) to list every monster in the game.
export const ALL_MONSTER_TYPES: string[] = [...MONSTER_TYPE_ORDER, ...SHOP_MONSTER_TYPES]

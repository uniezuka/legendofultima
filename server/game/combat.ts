// Shared with src/game/combat.ts — keep in sync
import type { Monster } from './types'

export interface CombatResult {
  attackerDamage: number
  defenderDamage: number
  defenderNewCurrentDef: number
  defenderBreaksShield: boolean
  log: string
}

export function resolveCombat(attacker: Monster, target: Monster): CombatResult {
  if (target.state === 'defending') {
    const shield = target.currentDef
    const newShield = Math.max(0, shield - attacker.atk)
    const breaksShield = newShield <= 0

    if (attacker.atk > shield) {
      const hpDmg = attacker.atk - shield
      return {
        attackerDamage: 0,
        defenderDamage: hpDmg,
        defenderNewCurrentDef: 0,
        defenderBreaksShield: true,
        log: `${attacker.type} shatters ${target.type}'s shield — ${hpDmg} dmg`,
      }
    } else if (attacker.atk < shield) {
      return {
        attackerDamage: shield - attacker.atk,
        defenderDamage: 0,
        defenderNewCurrentDef: newShield,
        defenderBreaksShield: breaksShield,
        log: breaksShield
          ? `${attacker.type} breaks ${target.type}'s shield (${shield}→0), attacker takes ${shield - attacker.atk}`
          : `${attacker.type} chips ${target.type}'s shield (${shield}→${newShield}), attacker takes ${shield - attacker.atk}`,
      }
    } else {
      return {
        attackerDamage: 0,
        defenderDamage: 0,
        defenderNewCurrentDef: 0,
        defenderBreaksShield: true,
        log: `${attacker.type} breaks ${target.type}'s shield (depleted) — no damage`,
      }
    }
  }
  return {
    attackerDamage: 0,
    defenderDamage: attacker.atk,
    defenderNewCurrentDef: target.currentDef,
    defenderBreaksShield: false,
    log: `${attacker.type} hits idle ${target.type} for ${attacker.atk}`,
  }
}

export function getAttackTargets(monsters: Record<string, Monster>, attacker: Monster): string[] {
  return Object.values(monsters)
    .filter(m => {
      if (m.owner === attacker.owner) return false
      const dist = Math.abs(attacker.coord.row - m.coord.row) + Math.abs(attacker.coord.col - m.coord.col)
      return attacker.range >= 2 ? dist <= 2 : dist === 1
    })
    .map(m => m.id)
}

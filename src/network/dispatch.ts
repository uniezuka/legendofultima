import type { GameAction } from './actions'
import { emitAction } from './socket'
import { useGameStore } from '../store/gameStore'
import { useOnlineStore } from '../store/onlineStore'

export function dispatch(action: GameAction) {
  const { isOnline } = useOnlineStore.getState()

  if (isOnline) {
    emitAction(action)
    return
  }

  // Campaign / local mode — apply directly to the store
  const store = useGameStore.getState()
  switch (action.type) {
    case 'ROLL_DICE':                store.rollDice(); break
    case 'SPEND_LUCK':               store.spendLuck(action.payload.dir); break
    case 'ADVANCE_PHASE':            store.advancePhase(); break
    case 'PLACE_PATH':               store.placePathOnBoard(action.payload.anchor); break
    case 'SKIP_PATH':                store.skipPathPlacement(); break
    case 'SUMMON_MONSTER':           store.summonMonster(action.payload.coord); break
    case 'DONE_SUMMONING':           store.doneSummoning(); break
    case 'MOVE_MONSTER':             store.moveMonster(action.payload.targetCoord); break
    case 'SKIP_MOVE':                store.skipMove(); break
    case 'ATTACK_TARGET':            store.attackTarget(action.payload.targetId); break
    case 'DEFEND_MONSTER':           store.defendMonster(); break
    case 'USE_ABILITY':              store.useAbility(action.payload.targetCoord); break
    case 'SKIP_COMBAT':              store.skipCombat(); break
    case 'DONE_MONSTER_ACTIONS':     store.doneMonsterActions(); break
    case 'FORCE_END_MONSTER_ACTIONS': store.forceEndMonsterActions(); break
  }
}

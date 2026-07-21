import { useOnlineStore } from '../store/onlineStore'
import { useProfileStore } from '../store/profileStore'
import { MONSTER_TEMPLATES, MONSTER_TYPE_ORDER } from '../constants/monsters'
import type { PlayerId } from '../types/game'

// Filters the summon roster to the player's purchased loadout — but only for
// "my own" seat. The opponent's (PvP, non-interactive/dimmed panel) or the AI's
// (Campaign) summon list always shows the full starter set: the campaign AI's
// monster access is intentionally unaffected by the shop/loadout system (see
// docs/SHOP_ECONOMY_SPEC.md), and the opponent's PvP panel is display-only —
// the server independently enforces the real loadout regardless of what this
// shows (server/game/apply.ts, SUMMON_MONSTER).
export function useSummonableTypes(playerId: PlayerId): string[] {
  const isOnline = useOnlineStore(s => s.isOnline)
  const myPlayerId = useOnlineStore(s => s.myPlayerId)
  const myLoadout = useProfileStore(s => s.loadout)

  const isMe = isOnline ? playerId === myPlayerId : playerId === 'player1'
  const types = isMe && myLoadout.length > 0 ? myLoadout : MONSTER_TYPE_ORDER
  return [...types].sort((a, b) => MONSTER_TEMPLATES[a].cost - MONSTER_TEMPLATES[b].cost)
}

import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { useOnlineStore } from '../store/onlineStore'
import { playBgm } from './audioManager'
import type { BgmKey } from '../constants/audio'

// Renders nothing — picks the BGM track that should be playing from game
// state and hands it to the audioManager singleton, which no-ops if that
// track is already active.
export default function BgmController() {
  const gameStarted = useGameStore(s => s.gameStarted)
  const gameMode = useGameStore(s => s.gameMode)
  const winner = useGameStore(s => s.winner)
  const isOnline = useOnlineStore(s => s.isOnline)
  const myPlayerId = useOnlineStore(s => s.myPlayerId)

  useEffect(() => {
    let key: BgmKey

    if (winner) {
      const localPlayer = isOnline ? myPlayerId : 'player1'
      key = winner === localPlayer ? 'victory' : 'defeat'
    } else if (gameStarted) {
      key = gameMode === 'campaign' ? 'campaign' : 'pvp'
    } else {
      key = 'title'
    }

    playBgm(key)
  }, [gameStarted, gameMode, winner, isOnline, myPlayerId])

  return null
}

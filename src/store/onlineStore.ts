import { create } from 'zustand'
import type { PlayerId } from '../types/game'

type LobbyStatus = 'idle' | 'creating' | 'waiting' | 'joining'
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

interface OnlineState {
  isOnline: boolean
  myPlayerId: PlayerId | null
  myNickname: string
  opponentNickname: string
  roomCode: string | null
  lobbyStatus: LobbyStatus
  roomError: string | null
  turnTimeLeft: number | null
  opponentDisconnected: boolean
  forfeitCountdown: number | null
  connectionStatus: ConnectionStatus
}

interface OnlineStore extends OnlineState {
  setOnline: (online: boolean) => void
  setMyPlayerId: (id: PlayerId) => void
  setMyNickname: (name: string) => void
  setOpponentNickname: (name: string) => void
  setRoomCode: (code: string) => void
  setLobbyStatus: (status: LobbyStatus) => void
  setRoomError: (msg: string | null) => void
  setTurnTimeLeft: (t: number | null) => void
  setOpponentDisconnected: (disconnected: boolean, countdown?: number) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  reset: () => void
}

const INITIAL: OnlineState = {
  isOnline: false,
  myPlayerId: null,
  myNickname: localStorage.getItem('lou_nickname') || '',
  opponentNickname: '',
  roomCode: null,
  lobbyStatus: 'idle',
  roomError: null,
  turnTimeLeft: null,
  opponentDisconnected: false,
  forfeitCountdown: null,
  connectionStatus: 'disconnected',
}

export const useOnlineStore = create<OnlineStore>((set) => ({
  ...INITIAL,

  setOnline: (isOnline) => set({ isOnline }),
  setMyPlayerId: (myPlayerId) => set({ myPlayerId }),
  setMyNickname: (myNickname) => {
    localStorage.setItem('lou_nickname', myNickname)
    set({ myNickname })
  },
  setOpponentNickname: (opponentNickname) => set({ opponentNickname }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setLobbyStatus: (lobbyStatus) => set({ lobbyStatus, roomError: null }),
  setRoomError: (roomError) => set({ roomError }),
  setTurnTimeLeft: (turnTimeLeft) => set({ turnTimeLeft }),
  setOpponentDisconnected: (opponentDisconnected, forfeitCountdown) =>
    set({ opponentDisconnected, forfeitCountdown: forfeitCountdown ?? null }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  reset: () => {
    localStorage.removeItem('lou_room_code')
    set({ ...INITIAL, myNickname: localStorage.getItem('lou_nickname') || '' })
  },
}))

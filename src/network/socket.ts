import { io, Socket } from 'socket.io-client'
import type { GameAction } from './actions'
import type { PlayerId } from '../types/game'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: false })
    attachHandlers(socket)
  }
  return socket
}

export function connectSocket() {
  getSocket().connect()
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function emitAction(action: GameAction) {
  getSocket().emit('action', action)
}

// Lazy import to avoid circular dependency — gameStore imports from here indirectly
function attachHandlers(s: Socket) {
  s.on('connect', () => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setConnectionStatus('connected')
    })
    // Try to rejoin a room on reconnect
    const roomCode = localStorage.getItem('lou_room_code')
    const sessionToken = localStorage.getItem('lou_session')
    if (roomCode && sessionToken) {
      s.emit('reconnect_room', { sessionToken })
    }
  })

  s.on('state', (serverState) => {
    import('../store/gameStore').then(({ useGameStore }) => {
      useGameStore.getState().setFromServer(serverState)
    })
  })

  s.on('match_start', (payload: {
    state: object
    player1Nickname: string
    player2Nickname: string
  }) => {
    Promise.all([
      import('../store/gameStore'),
      import('../store/onlineStore'),
    ]).then(([{ useGameStore }, { useOnlineStore }]) => {
      const onlineState = useOnlineStore.getState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useGameStore.getState().setFromServer(payload.state as any)
      useGameStore.getState().setGameStarted(true)
      const opponentNickname = onlineState.myPlayerId === 'player1'
        ? payload.player2Nickname
        : payload.player1Nickname
      useOnlineStore.getState().setOpponentNickname(opponentNickname)
      useOnlineStore.getState().setConnectionStatus('connected')
    })
  })

  s.on('timer', (data: { secondsLeft: number; endTime: number }) => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setTurnTimeLeft(data.secondsLeft)
    })
  })

  s.on('room_created', (payload: { roomCode: string; playerId: PlayerId }) => {
    localStorage.setItem('lou_room_code', payload.roomCode)
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setMyPlayerId(payload.playerId)
      useOnlineStore.getState().setRoomCode(payload.roomCode)
      useOnlineStore.getState().setLobbyStatus('waiting')
    })
  })

  s.on('room_joined', (payload: { roomCode: string; playerId: PlayerId }) => {
    localStorage.setItem('lou_room_code', payload.roomCode)
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setMyPlayerId(payload.playerId)
      useOnlineStore.getState().setRoomCode(payload.roomCode)
      useOnlineStore.getState().setLobbyStatus('waiting')
    })
  })

  s.on('room_error', (payload: { message: string }) => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setRoomError(payload.message)
    })
  })

  s.on('reconnected', (payload: { playerId: PlayerId; roomCode: string }) => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setMyPlayerId(payload.playerId)
      useOnlineStore.getState().setRoomCode(payload.roomCode)
      useOnlineStore.getState().setConnectionStatus('connected')
    })
  })

  s.on('opponent_disconnected', (payload: { forfeitIn: number }) => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setOpponentDisconnected(true, payload.forfeitIn)
    })
  })

  s.on('opponent_reconnected', () => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setOpponentDisconnected(false)
    })
  })

  s.on('game_over', (payload: { winner: PlayerId; reason: 'win' | 'forfeit' }) => {
    Promise.all([
      import('../store/gameStore'),
      import('../store/onlineStore'),
    ]).then(([{ useGameStore }, { useOnlineStore }]) => {
      if (payload.reason === 'forfeit') {
        useGameStore.getState().setWinner(payload.winner)
      }
      useOnlineStore.getState().setOpponentDisconnected(false)
    })
  })

  s.on('disconnect', () => {
    import('../store/onlineStore').then(({ useOnlineStore }) => {
      useOnlineStore.getState().setConnectionStatus('reconnecting')
    })
  })
}

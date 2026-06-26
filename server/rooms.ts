import type { Server, Socket } from 'socket.io'
import type { ServerGameState, GameAction, PlayerId } from './game/types.js'
import { createInitialMatchState } from './game/init.js'
import { applyAction, runEndTurnAndAutoPhases } from './game/apply.js'

interface PlayerInfo {
  socketId: string
  sessionToken: string
  nickname: string
  playerId: PlayerId
}

interface Room {
  code: string
  players: Partial<Record<PlayerId, PlayerInfo>>
  state: ServerGameState | null
  turnTimerHandle: ReturnType<typeof setTimeout> | null
  turnTimerInterval: ReturnType<typeof setInterval> | null
  turnEndTime: number | null
  disconnectHandles: Partial<Record<PlayerId, ReturnType<typeof setTimeout>>>
  disconnectIntervals: Partial<Record<PlayerId, ReturnType<typeof setInterval>>>
  inactiveHandle: ReturnType<typeof setTimeout> | null
}

const rooms = new Map<string, Room>()
const sessions = new Map<string, { roomCode: string; playerId: PlayerId }>()

const TURN_MS = 180_000
const FORFEIT_MS = 60_000
const ROOM_EXPIRE_MS = 10 * 60_000

function makeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return rooms.has(code) ? makeRoomCode() : code
}

function broadcast(io: Server, room: Room) {
  if (room.state) io.to(room.code).emit('state', room.state)
}

function stopTurnTimer(room: Room) {
  if (room.turnTimerHandle) { clearTimeout(room.turnTimerHandle); room.turnTimerHandle = null }
  if (room.turnTimerInterval) { clearInterval(room.turnTimerInterval); room.turnTimerInterval = null }
  room.turnEndTime = null
}

function startTurnTimer(io: Server, room: Room) {
  stopTurnTimer(room)
  const endTime = Date.now() + TURN_MS
  room.turnEndTime = endTime

  room.turnTimerInterval = setInterval(() => {
    const secondsLeft = Math.max(0, Math.round((endTime - Date.now()) / 1000))
    io.to(room.code).emit('timer', { secondsLeft, endTime })
  }, 1000)

  room.turnTimerHandle = setTimeout(() => {
    stopTurnTimer(room)
    if (!room.state || room.state.winner) return

    const activePlayer = room.state.activePlayer
    // Force end from any phase
    let s = room.state
    if (s.phase === 'monsterActions') {
      s = applyAction(s, { type: 'FORCE_END_MONSTER_ACTIONS' }, activePlayer)
    }
    if (s.phase === 'endTurn' || s.phase !== 'monsterActions') {
      s = { ...s, phase: 'endTurn' }
      s = runEndTurnAndAutoPhases(s)
    }
    room.state = s
    broadcast(io, room)

    if (!room.state.winner) startTurnTimer(io, room)
    else emitGameOver(io, room, room.state.winner, 'win')
  }, TURN_MS)
}

function emitGameOver(io: Server, room: Room, winner: PlayerId, reason: 'win' | 'forfeit') {
  stopTurnTimer(room)
  io.to(room.code).emit('game_over', { winner, reason })
  scheduleRoomCleanup(room)
}

function scheduleRoomCleanup(room: Room) {
  room.inactiveHandle = setTimeout(() => {
    rooms.delete(room.code)
    for (const p of Object.values(room.players)) {
      if (p) sessions.delete(p.sessionToken)
    }
  }, ROOM_EXPIRE_MS)
}

function findRoomForSocket(socketId: string): Room | null {
  for (const room of rooms.values()) {
    for (const p of Object.values(room.players)) {
      if (p?.socketId === socketId) return room
    }
  }
  return null
}

function findPlayerForSocket(room: Room, socketId: string): PlayerId | null {
  for (const [id, p] of Object.entries(room.players)) {
    if (p?.socketId === socketId) return id as PlayerId
  }
  return null
}

// ── Public handlers ──────────────────────────────────────────────────────────

export function handleCreateRoom(
  io: Server,
  socket: Socket,
  { nickname, sessionToken }: { nickname: string; sessionToken: string },
) {
  const code = makeRoomCode()
  const room: Room = {
    code,
    players: {},
    state: null,
    turnTimerHandle: null,
    turnTimerInterval: null,
    turnEndTime: null,
    disconnectHandles: {},
    disconnectIntervals: {},
    inactiveHandle: null,
  }
  room.players['player1'] = { socketId: socket.id, sessionToken, nickname, playerId: 'player1' }
  rooms.set(code, room)
  sessions.set(sessionToken, { roomCode: code, playerId: 'player1' })
  socket.join(code)
  socket.emit('room_created', { roomCode: code, playerId: 'player1' })
}

export function handleJoinRoom(
  io: Server,
  socket: Socket,
  { roomCode, nickname, sessionToken }: { roomCode: string; nickname: string; sessionToken: string },
) {
  const code = roomCode.toUpperCase()
  const room = rooms.get(code)
  if (!room) { socket.emit('room_error', { message: 'Room not found.' }); return }
  if (room.players['player2']) { socket.emit('room_error', { message: 'Room is full.' }); return }
  if (room.inactiveHandle) { socket.emit('room_error', { message: 'Game has ended.' }); return }

  room.players['player2'] = { socketId: socket.id, sessionToken, nickname, playerId: 'player2' }
  sessions.set(sessionToken, { roomCode: code, playerId: 'player2' })
  socket.join(code)
  socket.emit('room_joined', { roomCode: code, playerId: 'player2' })

  // Both players present — start match
  const p1 = room.players['player1']!
  const p2 = room.players['player2']!
  room.state = createInitialMatchState()

  io.to(code).emit('match_start', {
    state: room.state,
    player1Nickname: p1.nickname,
    player2Nickname: p2.nickname,
  })

  startTurnTimer(io, room)
}

export function handleAction(
  io: Server,
  socket: Socket,
  action: GameAction,
) {
  const room = findRoomForSocket(socket.id)
  if (!room || !room.state || room.state.winner) return
  const playerId = findPlayerForSocket(room, socket.id)
  if (!playerId) return

  const prev = room.state
  room.state = applyAction(room.state, action, playerId)
  if (room.state === prev) return  // unchanged — invalid action

  broadcast(io, room)

  if (room.state.winner) {
    emitGameOver(io, room, room.state.winner, 'win')
    return
  }

  // New turn just started after ADVANCE_PHASE on endTurn
  if (action.type === 'ADVANCE_PHASE' && room.state.phase === 'rollDice') {
    startTurnTimer(io, room)
  }
}

export function handleDisconnect(io: Server, socket: Socket) {
  const room = findRoomForSocket(socket.id)
  if (!room || !room.state || room.state.winner) return
  const playerId = findPlayerForSocket(room, socket.id)
  if (!playerId) return

  stopTurnTimer(room)
  io.to(room.code).emit('opponent_disconnected', { forfeitIn: FORFEIT_MS / 1000 })

  let remaining = FORFEIT_MS / 1000
  room.disconnectIntervals[playerId] = setInterval(() => {
    remaining -= 5
    if (remaining > 0) io.to(room.code).emit('opponent_disconnected', { forfeitIn: remaining })
  }, 5000)

  room.disconnectHandles[playerId] = setTimeout(() => {
    if (room.disconnectIntervals[playerId]) {
      clearInterval(room.disconnectIntervals[playerId])
      delete room.disconnectIntervals[playerId]
    }
    const opponent: PlayerId = playerId === 'player1' ? 'player2' : 'player1'
    emitGameOver(io, room, opponent, 'forfeit')
  }, FORFEIT_MS)
}

export function handleReconnect(
  io: Server,
  socket: Socket,
  { sessionToken }: { sessionToken: string },
) {
  const session = sessions.get(sessionToken)
  if (!session) { socket.emit('room_error', { message: 'Session not found.' }); return }

  const room = rooms.get(session.roomCode)
  if (!room || room.inactiveHandle) { socket.emit('room_error', { message: 'Game has ended.' }); return }

  const { playerId } = session
  const playerInfo = room.players[playerId]
  if (!playerInfo) return

  // Cancel forfeit
  if (room.disconnectHandles[playerId]) {
    clearTimeout(room.disconnectHandles[playerId])
    delete room.disconnectHandles[playerId]
  }
  if (room.disconnectIntervals[playerId]) {
    clearInterval(room.disconnectIntervals[playerId])
    delete room.disconnectIntervals[playerId]
  }

  playerInfo.socketId = socket.id
  socket.join(session.roomCode)

  socket.to(session.roomCode).emit('opponent_reconnected')
  if (room.state) {
    socket.emit('reconnected', { playerId, roomCode: session.roomCode })
    socket.emit('state', room.state)
    if (room.turnEndTime) {
      socket.emit('timer', { secondsLeft: Math.max(0, Math.round((room.turnEndTime - Date.now()) / 1000)), endTime: room.turnEndTime })
    }
  }

  if (!room.state?.winner) startTurnTimer(io, room)
}

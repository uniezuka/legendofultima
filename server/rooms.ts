import type { Server, Socket } from 'socket.io'
import type { ServerGameState, GameAction, PlayerId } from './game/types.js'
import { createInitialMatchState } from './game/init.js'
import { applyAction, runEndTurnAndAutoPhases } from './game/apply.js'
import { prisma } from './db.js'
import { STARTER_MONSTERS } from './game/economy.js'
import { applyMatchResult } from './profile.js'

interface PlayerInfo {
  socketId: string
  sessionToken: string
  nickname: string
  playerId: PlayerId
  userId?: string
}

interface Room {
  code: string
  players: Partial<Record<PlayerId, PlayerInfo>>
  state: ServerGameState | null
  // True once emitGameOver has run for this room — the authoritative "is this
  // match over" flag. Distinct from state.winner: forfeit endings never set
  // state.winner, so relying on that alone let a stale disconnect timer (or a
  // real win racing a pending forfeit) fire emitGameOver a second time and
  // double-award PvP gold/stats.
  matchEnded: boolean
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
    if (!room.state || room.matchEnded) return

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

// Covers every end-of-match path (normal win, timer-forced end, quit, disconnect
// forfeit) — a single choke point so PvP gold/stats are recorded exactly once
// per match regardless of how it ended. Fire-and-forget: the game_over
// broadcast to clients must not wait on a database round trip, and a
// transient DB failure here shouldn't affect the match outcome the players see.
function recordPvpResult(room: Room, winner: PlayerId) {
  const loser: PlayerId = winner === 'player1' ? 'player2' : 'player1'
  const winnerId = room.players[winner]?.userId
  const loserId = room.players[loser]?.userId
  if (winnerId) applyMatchResult(winnerId, 'pvp', 'win').catch(err => console.error('Failed to record PvP win:', err))
  if (loserId) applyMatchResult(loserId, 'pvp', 'loss').catch(err => console.error('Failed to record PvP loss:', err))
}

function emitGameOver(io: Server, room: Room, winner: PlayerId, reason: 'win' | 'forfeit') {
  if (room.matchEnded) return  // already recorded — blocks a stale disconnect timer or a duplicate call
  room.matchEnded = true
  stopTurnTimer(room)
  clearAllDisconnectTimers(room)
  io.to(room.code).emit('game_over', { winner, reason })
  recordPvpResult(room, winner)
  scheduleRoomCleanup(room)
}

// Clears every pending disconnect-forfeit timer/interval in the room — called
// once a match is over by any means, so a disconnect that happened earlier in
// the same match can't still fire its own forfeit after the fact.
function clearAllDisconnectTimers(room: Room) {
  for (const handle of Object.values(room.disconnectHandles)) if (handle) clearTimeout(handle)
  for (const interval of Object.values(room.disconnectIntervals)) if (interval) clearInterval(interval)
  room.disconnectHandles = {}
  room.disconnectIntervals = {}
}

function deleteRoom(room: Room) {
  rooms.delete(room.code)
  for (const p of Object.values(room.players)) {
    if (p) sessions.delete(p.sessionToken)
  }
}

function scheduleRoomCleanup(room: Room) {
  room.inactiveHandle = setTimeout(() => deleteRoom(room), ROOM_EXPIRE_MS)
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

// Unauthenticated dev connections (REQUIRE_SOCKET_AUTH=false, no userId) and
// accounts with no PlayerProfile row both fall back to the free starters.
async function fetchLoadout(userId: string | undefined): Promise<string[]> {
  if (!userId) return STARTER_MONSTERS
  const profile = await prisma.playerProfile.findUnique({ where: { userId } })
  return profile?.loadout ?? STARTER_MONSTERS
}

// ── Public handlers ──────────────────────────────────────────────────────────

export function handleCreateRoom(
  io: Server,
  socket: Socket,
  { nickname, sessionToken }: { nickname: string; sessionToken: string },
) {
  // Authenticated identity (set by the io.use handshake middleware) is
  // authoritative when present; client-supplied nickname is only a
  // fallback while REQUIRE_SOCKET_AUTH is not yet enforced.
  const displayName = (socket.data.displayName as string | undefined) ?? nickname
  const userId = socket.data.userId as string | undefined

  const code = makeRoomCode()
  const room: Room = {
    code,
    players: {},
    state: null,
    matchEnded: false,
    turnTimerHandle: null,
    turnTimerInterval: null,
    turnEndTime: null,
    disconnectHandles: {},
    disconnectIntervals: {},
    inactiveHandle: null,
  }
  room.players['player1'] = { socketId: socket.id, sessionToken, nickname: displayName, playerId: 'player1', userId }
  rooms.set(code, room)
  sessions.set(sessionToken, { roomCode: code, playerId: 'player1' })
  socket.join(code)
  socket.emit('room_created', { roomCode: code, playerId: 'player1' })
}

export async function handleJoinRoom(
  io: Server,
  socket: Socket,
  { roomCode, nickname, sessionToken }: { roomCode: string; nickname: string; sessionToken: string },
) {
  const displayName = (socket.data.displayName as string | undefined) ?? nickname
  const userId = socket.data.userId as string | undefined

  const code = roomCode.toUpperCase()
  const room = rooms.get(code)
  if (!room) { socket.emit('room_error', { message: 'Room not found.' }); return }
  if (room.players['player2']) { socket.emit('room_error', { message: 'Room is full.' }); return }
  if (room.inactiveHandle) { socket.emit('room_error', { message: 'Game has ended.' }); return }

  room.players['player2'] = { socketId: socket.id, sessionToken, nickname: displayName, playerId: 'player2', userId }
  sessions.set(sessionToken, { roomCode: code, playerId: 'player2' })
  socket.join(code)
  socket.emit('room_joined', { roomCode: code, playerId: 'player2' })

  // Both players present — start match
  const p1 = room.players['player1']!
  const p2 = room.players['player2']!
  const [loadout1, loadout2] = await Promise.all([fetchLoadout(p1.userId), fetchLoadout(p2.userId)])
  // A disconnect can fire while the loadout fetch above is in flight (see
  // handleDisconnect's `!room.state` branch) and tear the room down — don't
  // resurrect a match for a room that's already gone.
  if (!rooms.has(code) || room.matchEnded) return
  room.state = createInitialMatchState({ player1: loadout1, player2: loadout2 })

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
  if (!room || !room.state || room.matchEnded) return
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

export function handleQuit(io: Server, socket: Socket) {
  const room = findRoomForSocket(socket.id)
  if (!room || !room.state || room.matchEnded) return
  const playerId = findPlayerForSocket(room, socket.id)
  if (!playerId) return
  if (room.state.activePlayer !== playerId) return  // only the active player may quit, mirrors applyAction's turn gate

  const opponent: PlayerId = playerId === 'player1' ? 'player2' : 'player1'
  emitGameOver(io, room, opponent, 'forfeit')
}

export function handleDisconnect(io: Server, socket: Socket) {
  const room = findRoomForSocket(socket.id)
  if (!room || room.matchEnded) return
  const playerId = findPlayerForSocket(room, socket.id)
  if (!playerId) return

  if (!room.state) {
    // Disconnected before the match finished setting up — either still
    // waiting for a second player, or mid loadout-fetch in handleJoinRoom
    // (handleJoinRoom checks matchEnded/rooms.has(code) after that await and
    // bails out if this ran first). The socket 'disconnect' event only fires
    // once, so this is the only chance to handle it — tear the room down
    // instead of silently dropping it and leaving any other player waiting
    // on a match that will never start.
    room.matchEnded = true
    io.to(room.code).emit('room_error', { message: 'Opponent left before the match could start.' })
    deleteRoom(room)
    return
  }

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

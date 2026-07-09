import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import {
  handleCreateRoom,
  handleJoinRoom,
  handleAction,
  handleQuit,
  handleDisconnect,
  handleReconnect,
} from './rooms.js'
import type { GameAction } from './game/types.js'
import { authRouter } from './auth.js'
import { campaignRouter } from './campaign.js'
import { verifyAccessToken } from './tokens.js'

const PORT = Number(process.env.PORT) || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
const REQUIRE_SOCKET_AUTH = process.env.REQUIRE_SOCKET_AUTH === 'true'

const app = express()
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/auth', authRouter)
app.use('/', campaignRouter)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'], credentials: true },
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) {
    if (!REQUIRE_SOCKET_AUTH) return next()
    return next(new Error('unauthorized'))
  }
  try {
    const payload = verifyAccessToken(token)
    socket.data.userId = payload.sub
    socket.data.displayName = payload.displayName
    next()
  } catch (err) {
    console.log(`[socket auth] rejected handshake: ${(err as Error).message}`)
    if (!REQUIRE_SOCKET_AUTH) return next()
    next(new Error('unauthorized'))
  }
})

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)

  socket.on('create_room', (payload: { nickname: string; sessionToken: string }) => {
    handleCreateRoom(io, socket, payload)
  })

  socket.on('join_room', (payload: { roomCode: string; nickname: string; sessionToken: string }) => {
    handleJoinRoom(io, socket, payload)
  })

  socket.on('action', (action: GameAction) => {
    handleAction(io, socket, action)
  })

  socket.on('reconnect_room', (payload: { sessionToken: string }) => {
    handleReconnect(io, socket, payload)
  })

  socket.on('quit_room', () => {
    handleQuit(io, socket)
  })

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    handleDisconnect(io, socket)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Legend of Ultima server listening on port ${PORT}`)
  console.log(`Accepting connections from: ${CLIENT_ORIGIN}`)
})

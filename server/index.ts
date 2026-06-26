import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import {
  handleCreateRoom,
  handleJoinRoom,
  handleAction,
  handleDisconnect,
  handleReconnect,
} from './rooms.js'
import type { GameAction } from './game/types.js'

const PORT = Number(process.env.PORT) || 3001
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
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

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    handleDisconnect(io, socket)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Legend of Ultima server listening on port ${PORT}`)
  console.log(`Accepting connections from: ${CLIENT_ORIGIN}`)
})

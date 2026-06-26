# How Online PvP Works — Programmer's Guide

For a senior web developer new to online game programming.

---

## The Core Pattern: Authoritative Server

In a normal web app, the client has its own state and talks to a server to persist it. Online games flip this: **the server owns the state, clients are just views**.

Think of it like React with a remote Zustand store — the server is the store, both browsers are components subscribed to it.

```
Browser A                    Server                    Browser B
─────────                    ──────                    ─────────
render(state)  ←── state ─── ServerGameState ─── state ──→ render(state)
    │                              │
    └─── emit('action', ...) ──────┘
                                   │
                     applyAction() │ (pure function)
                                   │
                     broadcast state to both
```

If the client mutated its own store and sent the result to the server, a clever user could send `"I win"` directly. With the authoritative pattern, the server validates every action before applying it — the client can only send *intent*, not *outcome*.

---

## The Transport: Socket.io

Regular HTTP is request/response — the client asks, the server answers, connection closes. That doesn't work for games because you need the server to **push** state to both clients whenever anything changes.

Socket.io keeps a persistent WebSocket connection open. Either side can emit events at any time:

```ts
// client emits an action
socket.emit('action', { type: 'ROLL_DICE' })

// server pushes new state to everyone in the room
io.to(room.code).emit('state', newGameState)
```

`io.to(room.code).emit(...)` is the key — it broadcasts to all sockets that joined that room code, which is how both players see the update simultaneously.

---

## The Full Action Flow

When Player 1 rolls the dice:

```
1. SidePanel.tsx
   dispatch({ type: 'ROLL_DICE' })

2. dispatch.ts checks isOnline → true
   emitAction({ type: 'ROLL_DICE' })

3. socket.ts
   socket.emit('action', { type: 'ROLL_DICE' })

4. server/rooms.ts — handleAction()
   - finds the room from socket.id
   - finds which playerId owns this socket
   - calls applyAction(state, action, 'player1')

5. server/game/apply.ts — applyAction()
   - checks state.activePlayer === actingPlayer  ← auth
   - checks state.phase === 'rollDice'           ← phase guard
   - rolls the die, returns new state

6. rooms.ts detects state changed
   io.to(room.code).emit('state', newState)
                          ↓             ↓
                      Tab 1          Tab 2

7. socket.ts on both clients — 'state' handler
   useGameStore.getState().setFromServer(newState)

8. React re-renders both browsers with the new dice roll
```

Player 2's screen updates even though they did nothing. That's the push model.

---

## Why the Client Doesn't Apply Actions Locally

You might think: "why not update the client immediately, then sync to server?" That's called **optimistic updates** and some games use it for responsiveness. This project waits for the server round-trip instead. At LAN speeds this is imperceptible; over the internet there's a small delay (~50–150ms) but it keeps the logic dead simple — there's no state reconciliation if the server rejects an action.

The `setFromServer` function in `gameStore.ts` handles the merge carefully — it preserves local UI state (which monster is selected, path rotation) within the same turn, and resets it on turn change:

```ts
setFromServer: (serverState) => {
  const turnChanged = serverState.turnNumber !== current.turnNumber
                   || serverState.activePlayer !== current.activePlayer
  set({
    ...serverState,
    selectedMonsterId: turnChanged ? null : current.selectedMonsterId,
    // ... other UI-only fields preserved within the same turn
  })
}
```

---

## The Room System

Rooms are a `Map<string, Room>` in memory on the server. When both players are in the same room, `io.to(roomCode)` reaches both their sockets simultaneously.

```ts
const rooms = new Map<string, Room>()  // server/rooms.ts

interface Room {
  code: string
  players: { player1?: PlayerInfo; player2?: PlayerInfo }
  state: ServerGameState | null
  turnTimerHandle: ...
  disconnectHandles: ...
}
```

No database. No persistence between server restarts. Rooms only need to last as long as a match, so this is fine for MVP.

---

## Reconnection

The tricky part of real-time games is handling disconnects. The approach here:

1. Each browser generates a `sessionToken` (UUID) and saves it to `localStorage`
2. On `create_room`/`join_room`, the server maps `sessionToken → { roomCode, playerId }`
3. On disconnect, the server starts a 60s forfeit countdown but doesn't immediately end the game
4. When the browser reconnects (page refresh, brief network drop), the socket fires `connect` again
5. The client automatically emits `reconnect_room { sessionToken }`
6. The server looks up the session, re-attaches the new `socket.id` to the existing room, cancels the forfeit, and pushes the full current state

```ts
// socket.ts — fires on every connect and reconnect
s.on('connect', () => {
  const roomCode = localStorage.getItem('lou_room_code')
  const sessionToken = localStorage.getItem('lou_session')
  if (roomCode && sessionToken) {
    s.emit('reconnect_room', { sessionToken })
  }
})
```

The `sessionToken` is the identity token. The `socket.id` is just a transport handle that changes every time the connection drops — the session is what ties a browser tab to a player slot across disconnects.

---

## The Turn Timer

The server owns the timer — clients can't cheat by pausing their browser. Every second the server emits `timer { secondsLeft }` and each client renders it locally. When time runs out, the server forces the turn to end and broadcasts the new state. The client receives it like any other state update — it doesn't know or care that a timer caused it.

```ts
// server/rooms.ts
room.turnTimerHandle = setTimeout(() => {
  // force end turn, run auto-phases for next player
  room.state = runEndTurnAndAutoPhases(room.state)
  broadcast(io, room)           // both clients update
  startTurnTimer(io, room)      // restart for next player
}, TURN_MS)
```

---

## The Dispatch Layer — Campaign vs Online Isolation

In campaign mode, `dispatch()` calls the gameStore directly — everything is local, no server involved. In online mode, `dispatch()` fires a socket event and the client **waits**. The store only updates when the server broadcasts back.

```ts
// src/network/dispatch.ts
export function dispatch(action: GameAction) {
  const { isOnline } = useOnlineStore.getState()

  if (isOnline) {
    socket.emit('action', action)   // → wait for server broadcast
    return
  }

  // Campaign — apply directly to local store
  const store = useGameStore.getState()
  switch (action.type) {
    case 'ROLL_DICE': store.rollDice(); break
    // ...
  }
}
```

The `isOnline` flag is the **only** branch point between online and campaign. All UI components call `dispatch()` without knowing which mode they're in — the routing is invisible to them. This is why campaign mode was completely unaffected by the multiplayer implementation.

---

## Files at a Glance

```
server/
  index.ts          Socket.io server setup, event wiring
  rooms.ts          Room lifecycle, turn timer, forfeit countdown, reconnect
  game/
    apply.ts        applyAction() — pure function, all 14 action handlers
    init.ts         createInitialMatchState() — first server state
    types.ts        ServerGameState, GameAction union type

src/network/
  socket.ts         Socket singleton, all server event handlers
  dispatch.ts       The isOnline routing branch
  actions.ts        GameAction type (14 action types)

src/store/
  onlineStore.ts    isOnline, myPlayerId, timer, disconnect state
  gameStore.ts      setFromServer() — merges server state into client store

src/components/
  screens/LobbyScreen.tsx       Room create/join UI
  hud/TurnTimer.tsx             MM:SS countdown display
  overlays/DisconnectOverlay.tsx  Opponent disconnected + forfeit countdown
```

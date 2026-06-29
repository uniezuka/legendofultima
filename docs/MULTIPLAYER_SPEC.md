# Online Multiplayer — Technical Specification

## Overview

Replaces local 2-player PvP with network play. Two players connect via a 6-character room code. The server holds authoritative game state. Campaign mode is completely untouched.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Transport | Socket.io v4 |
| Server runtime | Node.js 20 + TypeScript (tsx watch in dev) |
| Server framework | Express (HTTP health check only) |
| Client | socket.io-client |
| Hosting | Render Web Service (persistent process) |

---

## Architecture

```
Player 1 (Browser)          Node.js Server               Player 2 (Browser)
──────────────────          ──────────────               ──────────────────
Zustand (replica) ←──────── ServerGameState (authority) ─────→ Zustand (replica)
socket.io-client  ────────→ validate + applyAction       ←───── socket.io-client
                            broadcast to room
```

Neither client runs game logic during online play. All mutations happen on the server. Clients are pure views that render the server's broadcast state.

---

## Player Identity

Each client generates a `sessionToken` (UUID v4) on first lobby visit, stored in `localStorage` as `lou_session`. Sent on every `create_room` and `join_room` event. The server maps `sessionToken → { roomCode, playerId }` so reconnecting players re-attach to their room without re-entering a code.

When accounts are added later, `sessionToken` is replaced by a JWT — no other changes needed.

---

## Room Lifecycle

```
host opens lobby → socket connects
  → emits: create_room { nickname, sessionToken }
  → server creates room (6-char code, no ambiguous chars)
  → server emits to host: room_created { roomCode, playerId: 'player1' }
  → host waits, displays room code

guest opens lobby → socket connects
  → emits: join_room { roomCode, nickname, sessionToken }
  → server validates code (not full, not ended)
  → server emits to guest: room_joined { roomCode, playerId: 'player2' }
  → server emits to both:  match_start { state, player1Nickname, player2Nickname }
  → server starts 3-minute turn timer

match runs
  → active player emits action events
  → server validates (active player check, phase check), applies, broadcasts state

match ends (win / forfeit / timer expire)
  → server emits: game_over { winner: PlayerId, reason: 'win' | 'forfeit' }
  → room marked inactive, cleaned up after 10 minutes
```

---

## Socket Events

### Client → Server

| Event | Payload | Notes |
|---|---|---|
| `create_room` | `{ nickname, sessionToken }` | host creates a room |
| `join_room` | `{ roomCode, nickname, sessionToken }` | guest joins by code |
| `action` | `GameAction` | any game state action (see Actions) |
| `reconnect_room` | `{ sessionToken }` | on page refresh / reconnect |

### Server → Client

| Event | Payload | Notes |
|---|---|---|
| `room_created` | `{ roomCode, playerId }` | sent to host |
| `room_joined` | `{ roomCode, playerId }` | sent to guest |
| `room_error` | `{ message }` | invalid code, room full, etc. |
| `match_start` | `{ state, player1Nickname, player2Nickname }` | both players, game begins |
| `state` | `ServerGameState` | broadcast after every valid action |
| `timer` | `{ secondsLeft, endTime }` | every second during active turn |
| `opponent_disconnected` | `{ forfeitIn: number }` | seconds until forfeit; repeated every 5s |
| `opponent_reconnected` | — | opponent came back |
| `game_over` | `{ winner: PlayerId, reason: 'win' \| 'forfeit' }` | match over |
| `reconnected` | `{ playerId, roomCode }` | sent to reconnected player |

---

## Action Types

All 14 dispatched action types. UI-only actions (select path, select monster, inspect) never leave the client.

```ts
type GameAction =
  | { type: 'ROLL_DICE' }
  | { type: 'SPEND_LUCK';              payload: { dir: 1 | -1 } }
  | { type: 'ADVANCE_PHASE' }          // rollDice→placePath, endTurn→next turn
  | { type: 'PLACE_PATH';              payload: { pathId: string; anchor: Coord; rotation: number } }
  | { type: 'SKIP_PATH' }
  | { type: 'SUMMON_MONSTER';          payload: { monsterType: string; coord: Coord } }
  | { type: 'DONE_SUMMONING' }
  | { type: 'MOVE_MONSTER';            payload: { monsterId: string; targetCoord: Coord } }
  | { type: 'SKIP_MOVE';               payload: { monsterId: string } }
  | { type: 'ATTACK_TARGET';           payload: { attackerId: string; targetId: string } }
  | { type: 'DEFEND_MONSTER';          payload: { monsterId: string } }
  | { type: 'SKIP_COMBAT';             payload: { monsterId: string } }
  | { type: 'DONE_MONSTER_ACTIONS' }
  | { type: 'FORCE_END_MONSTER_ACTIONS' }
```

---

## Server Game State

`ServerGameState` is the client's `GameState` minus UI-only fields, plus server-side counters:

```ts
type ServerGameState = Omit<GameState,
  'selectedPathId' | 'selectedPathRotation' | 'selectedMonsterId' |
  'selectedMonsterTemplateType' | 'inspectedMonsterId' | 'pendingAttackTargetId'
> & {
  nextMonsterId: number   // auto-increment for monster IDs
  nextPathId: number      // auto-increment for path card IDs
}
```

The server's `applyAction(state, action, actingPlayer)` is a pure function that returns the new state or the unchanged state on invalid input. `rooms.ts` detects no-ops (`state === prev`) and skips the broadcast.

---

## Turn Timer

- Duration: **180 seconds** per turn
- Starts: when `match_start` fires and on every new turn (after `ADVANCE_PHASE` from `endTurn`)
- Pauses: when active player disconnects (forfeit countdown takes over)
- Resets: at the start of each new turn
- On expire: server forces `endTurn` phase and calls `runEndTurnAndAutoPhases`, broadcasts new state, restarts timer for the next player

Server broadcasts `timer { secondsLeft, endTime }` every second. Client renders countdown in the active player's SidePanel. Amber at ≤30s, red+pulse at ≤10s.

---

## Disconnection Handling

```
player disconnects
  → server pauses turn timer
  → server starts 60s forfeit countdown
  → server emits opponent_disconnected { forfeitIn: 60 } to the other player
  → server emits opponent_disconnected every 5s with updated forfeitIn

player reconnects within 60s (matching sessionToken)
  → server cancels forfeit countdown
  → server re-attaches socket to room
  → server emits reconnected { playerId, roomCode } to reconnected player
  → server emits state (full current state) to reconnected player
  → server emits opponent_reconnected to other player
  → server restarts turn timer

60s expires without reconnect
  → server emits game_over { winner: otherPlayerId, reason: 'forfeit' }
  → room marked inactive
```

On the client side, the socket `disconnect` event sets `connectionStatus: 'reconnecting'`. On `connect`, the socket auto-emits `reconnect_room` if `lou_room_code` and `lou_session` are in localStorage.

---

## Dispatch Layer

`src/network/dispatch.ts` routes game actions to the correct destination, keeping campaign mode fully isolated from socket logic.

```ts
export function dispatch(action: GameAction) {
  const { isOnline } = useOnlineStore.getState()
  if (isOnline) {
    emitAction(action)   // → socket.emit('action', action)
    return
  }
  // Campaign / local — call corresponding gameStore mutation directly
  const store = useGameStore.getState()
  switch (action.type) { ... }
}
```

All game-state-changing calls in `SidePanel.tsx` and `Board.tsx` go through `dispatch()`. Pure UI calls (selectPath, selectMonster, inspectMonster) remain direct store calls.

---

## Client State

### onlineStore (`src/store/onlineStore.ts`)

New Zustand store for multiplayer-only state:

```ts
isOnline: boolean               // true once create_room or join_room emitted
myPlayerId: PlayerId | null     // 'player1' or 'player2'
myNickname: string              // persisted to localStorage as 'lou_nickname'
opponentNickname: string
roomCode: string | null         // persisted to localStorage as 'lou_room_code'
lobbyStatus: 'idle' | 'creating' | 'waiting' | 'joining'
connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
turnTimeLeft: number | null
opponentDisconnected: boolean
forfeitCountdown: number | null
```

### gameStore changes

- `setFromServer(serverState)` — merges server broadcast, preserves UI selection state within the same turn, resets it on turn change
- `setGameStarted(started)` — `true` on `match_start`; App.tsx routes to GameScreen
- `setWinner(winner)` — set on forfeit `game_over`

---

## Screen Routing

```
App.tsx checks gameStarted first (covers both campaign and online):
  if (gameStarted)           → GameScreen
  if (screen === 'lobby')    → LobbyScreen
  if (screen === 'campaign-select') → CampaignScreen
  if (screen === 'campaign-intro')  → StageIntroScreen
  default                    → TitleScreen
```

The `lobby` screen is a value in `campaignStore`'s `AppScreen` union. `goToLobby()` sets it. `reset()` in onlineStore removes `lou_room_code` from localStorage and returns lobbyStatus to idle.

---

## Directory Structure

```
shared/
  types.ts            — Single source of truth for all types used by both client and server
                        (PlayerId, GameMode, TurnPhase, Player, Monster, GameAction, etc.)

server/
  index.ts            — Express + Socket.io setup, event wiring, /health endpoint
  rooms.ts            — Room CRUD, match start, turn timer, forfeit countdown, reconnect
  .env                — PORT=3001, CLIENT_ORIGIN=http://localhost:5173
  .env.example        — template for deployment
  game/
    types.ts          — ServerGameState (server-only) + re-exports from shared/types
    constants.ts      — all board/game constants mirrored from client
    apply.ts          — applyAction() + runEndTurnAndAutoPhases() pure functions
    combat.ts         — resolveCombat(), getAttackTargets()
    movement.ts       — getConnectedFriendlyPath(), getReachableCells()
    paths.ts          — generatePaths(startId), getPathCells(), validatePathPlacement()
    dice.ts           — rollD6()
    init.ts           — createInitialMatchState() (already past auto-phases, phase = rollDice)
```

`server/game/types.ts` re-exports everything from `shared/types` so existing server imports remain unchanged. The shared module uses `import type` throughout — no runtime values cross the module boundary.

---

## Environment Variables

```
# server/.env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173   # dev; set to Render frontend URL in prod

# client/.env (Vite)
VITE_SERVER_URL=http://localhost:3001  # dev; set to Render backend URL in prod
```

---

## CORS

Server allows `CLIENT_ORIGIN` only, on both Express and the Socket.io instance.

---

## Deployment (Render)

- **Backend**: Render Web Service — `cd server && npm install && npm run build` build command, `node dist/index.js` start command. Set `PORT` and `CLIENT_ORIGIN` as env vars.
- **Frontend**: Render Static Site — `npm run build`, publish `dist/`. Set `VITE_SERVER_URL` to backend service URL before building.

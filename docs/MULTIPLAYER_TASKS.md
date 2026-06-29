# Online Multiplayer — Implementation Tasks

Reference: `docs/MULTIPLAYER_SPEC.md`

---

## Phase I — Backend Scaffold ✅

- [x] Add `server/` directory and `server/package.json` (Node.js, TypeScript, Express, Socket.io, cors, dotenv)
- [x] Add `server/tsconfig.json`
- [x] Create `server/.env` (PORT, CLIENT_ORIGIN)
- [x] Create `server/game/types.ts` — shared types (ServerGameState, GameAction union, PlayerId, etc.)
- [x] Create `server/index.ts` — Express app + Socket.io server + CORS from env
- [x] Create `server/rooms.ts` — Room map, create/join logic, sessionToken → socket mapping
- [x] Implement `create_room` handler — generate 6-char code, assign player1, emit `room_created`
- [x] Implement `join_room` handler — validate code, assign player2, emit `room_joined` + `match_start`
- [x] Implement `reconnect_room` handler — match sessionToken, re-attach socket, emit full state
- [x] Add `dev:server` script to root `package.json`
- [x] Smoke test: two browser tabs can create/join a room and see `match_start`

---

## Phase II — Server-Side Game Logic ✅

- [x] `server/game/dice.ts` — `rollD6()`
- [x] `server/game/combat.ts` — `resolveCombat()`, `getAttackTargets()`
- [x] `server/game/movement.ts` — `getConnectedFriendlyPath()`, `getReachableCells()`
- [x] `server/game/paths.ts` — `generatePaths(startId)`, `getPathCells()`, `validatePathPlacement()`
- [x] `server/game/constants.ts` — all game constants mirrored from client
- [x] `server/game/init.ts` — `createInitialMatchState()` (starts at rollDice phase after auto-phases)
- [x] `server/game/apply.ts` — `applyAction(state, action, actingPlayer)` pure function, 14 action handlers
- [x] `runEndTurnAndAutoPhases()` in apply.ts — end turn cleanup + generateMana + generatePaths
- [x] Turn timer in `server/rooms.ts` — 180s countdown, `timer` broadcast every second
- [x] Timer expire → force end turn → broadcast state → restart timer for next player
- [x] `action` socket handler — validate active player, call applyAction, broadcast state

---

## Phase III — Client Action Layer ✅

- [x] `socket.io-client` added to client `package.json`
- [x] `VITE_SERVER_URL` in `.env` and `.env.example`
- [x] `src/network/socket.ts` — singleton socket, connect/disconnect helpers, all event handlers
- [x] `src/network/actions.ts` — `GameAction` discriminated union (14 action types)
- [x] `src/network/dispatch.ts` — `dispatch(action)` routes to socket (online) or store (campaign)
- [x] `setFromServer(serverState)` added to `gameStore.ts` — preserves UI state within turn, resets on turn change
- [x] `setGameStarted(started)` and `setWinner(winner)` added to `gameStore.ts`
- [x] `src/store/onlineStore.ts` — new Zustand store (isOnline, myPlayerId, nicknames, timer, disconnect state)
- [x] All game-state-changing calls in `SidePanel.tsx` replaced with `dispatch()`
- [x] All game-state-changing calls in `Board.tsx` replaced with `dispatch()`
- [x] `isLockedOut` in SidePanel dims opponent panel during online play
- [x] Bug fix: `connect` event sets `connectionStatus = 'connected'` (was stuck at 'connecting')

---

## Phase IV — Lobby Screen ✅

- [x] `'lobby'` added to screen union in `campaignStore.ts`, `goToLobby()` action added
- [x] `src/components/screens/LobbyScreen.tsx` — nickname input, create room, join room, error display
- [x] Waiting state shows room code in large text
- [x] On `match_start` → `setGameStarted(true)` → App.tsx routes to GameScreen
- [x] `TitleScreen.tsx` — "2-Player Local" replaced with "⚔ Online PvP" → routes to lobby
- [x] `App.tsx` — lobby screen added to router
- [x] Smoke test: full lobby flow — two players create/join room, land on game screen ✅

---

## Phase V — Turn Timer UI ✅

- [x] `src/components/hud/TurnTimer.tsx` — MM:SS display, amber at ≤30s, red+pulse at ≤10s
- [x] `socket.on('timer', ...)` → `setTurnTimeLeft()` in onlineStore
- [x] `TurnTimer` mounted in active player's SidePanel (online only)

---

## Phase VI — Disconnection Handling ✅

- [x] `src/components/overlays/DisconnectOverlay.tsx` — opponent disconnected + forfeit countdown
- [x] `socket.on('opponent_disconnected', ...)` → show overlay
- [x] `socket.on('opponent_reconnected', ...)` → hide overlay
- [x] `socket.on('game_over', { reason: 'forfeit' })` → setWinner via gameStore
- [x] On `connect` event: emit `reconnect_room` if `lou_room_code` + `lou_session` in localStorage
- [x] `connectionStatus: 'reconnecting'` set on socket `disconnect` event

---

## Final Checks ✅

- [x] Campaign mode: play a full campaign match — no regressions
- [x] Online match: play a full match to completion (win condition)
- [x] Online match: let timer expire — phase advances correctly
- [x] Online match: disconnect one player, reconnect within 60s — game resumes
- [x] Online match: disconnect one player, wait 60s — forfeit fires correctly
- [x] Render deploy: backend Web Service deploys and accepts socket connections

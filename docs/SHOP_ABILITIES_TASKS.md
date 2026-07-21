# Shop, Loadout, Stats & Monster Abilities — Implementation Tasks

Reference: `docs/SHOP_ECONOMY_SPEC.md`, `docs/MONSTER_ABILITIES_SPEC.md`

**Status: All 6 phases code-complete. Manual smoke testing in progress — mage summon/loadout/shop flow and offline (campaign) ability use confirmed working, plus campaign gold-on-win; still open: online PvP ability use, full PvP gold/stats match, and the two-account loadout-separation check (see Phase IV/VI and Final Checks below).**

---

## Phase I — Data Model & Backend Endpoints ✅

- [x] Add `PlayerProfile` model to `server/prisma/schema.prisma` (`gold`, `ownedMonsters`, `loadout`)
- [x] Add `MatchStats` model to `server/prisma/schema.prisma` (`campaignWins`, `campaignLosses`, `pvpWins`, `pvpLosses` — the two campaign fields were later removed, see "Post-Ship Tweaks")
- [x] Prisma migration, create both rows in the signup transaction alongside `User`/`Credential`/`CampaignProgress`
- [x] Extend `GET /auth/me` (and signup/login) response with `profile` and `stats`
- [x] `POST /shop/purchase { monsterType }` — validate gold ≥ price, not already owned, atomic deduct + add (`server/profile.ts`)
- [x] `PUT /loadout { monsterTypes: string[5] }` — validate length 5, no dupes, all owned
- [x] `POST /match-result { mode, outcome }` — gold + stats update, shared `applyMatchResult()` helper for reuse by the PvP socket handler in Phase VI
- [x] Gold reward finalized: Campaign win 10G / loss 0G, PvP win 10G / loss 5G; White Mage / Black Mage price 110G each (`server/game/economy.ts`)

---

## Phase II — New Monster Templates (stat-only, no abilities yet) ✅

- [x] Add `white_mage` and `black_mage` to `MONSTER_TEMPLATES` in `src/constants/monsters.ts` (cost 3, hp 3, atk 3, def 1, move 1, range 2, `skills` populated for Phase III to consume)
- [x] Mirror both in `server/game/constants.ts`
- [x] Add both to `ALL_MONSTER_TYPES` (new export, distinct from `MONSTER_TYPE_ORDER` which stays the 5-starter in-match summon list until Phase IV's loadout filtering lands)
- [x] Smoke test: both mages summonable and playable as plain stat-only monsters (no ability yet) — confirmed working, once manually added to a test account's `ownedMonsters`/`loadout`, now that Phase IV's loadout filtering is in place

---

## Phase III — Shared Types & Server Ability Handling ✅

- [x] `shared/types.ts` (and the duplicated union in `src/network/actions.ts`): added `'ability'` to `MonsterAction`, added `USE_ABILITY` to `GameAction`
- [x] Added `ABILITY_DEFINITIONS` lookup (skill id → `{ range: 1, kind }`) in `server/game/abilities.ts` and mirrored in `src/constants/abilities.ts`
- [x] `server/game/apply.ts`: `USE_ABILITY` handler — same combat-step gating as attack/defend (`hasMoved`, not `hasActedThisTurn`, not `summoning`), range-1 orthogonal adjacency check, target-cell validation per ability kind
- [x] `create_path` handler: target empty → set `type:'path', owner: actingPlayer`
- [x] `destroy_path` handler: target path with no monster → set `type:'empty', owner:null`
- [x] Server-side loadout enforcement: `ServerGameState.loadouts` fetched once per player from `PlayerProfile.loadout` in `handleJoinRoom` (`server/rooms.ts`, now async), fixed for the whole match; `SUMMON_MONSTER` in `apply.ts` rejects any type outside `state.loadouts[activePlayer]`
- [x] `tsc --noEmit` passes clean on both client and server
- Note: the client doesn't yet consume `USE_ABILITY`/`loadouts` — that's Phase IV (UI, targeting, `dispatch()` wiring, AI). Nothing in Phase III is reachable from gameplay yet, same caveat as Phase II.

---

## Phase IV — Client Ability UX + AI ✅ (code complete, offline and online PvP smoke tests passed)

- [x] `src/network/dispatch.ts` / `gameStore.ts`: `useAbility()` + `setTargetingAbility()` actions, online (`emitAction`) and offline (direct store) paths — mirrors `server/game/apply.ts`'s `USE_ABILITY` logic exactly (same gating, same create/destroy rules)
- [x] `SidePanel.tsx`: "🔮 Use Ability" button in the combat step, shown only for monsters with a `skills` entry, with static description text (`ABILITY_DESCRIPTIONS`) — armed via the button, then "Click a highlighted tile" + Cancel, matching the earlier decision to keep this side-panel-only (not added to Monster Inspector) with a static (non-dynamic) description string
- [x] Board: two new highlight colors — `ability-create` (cyan) and `ability-destroy` (pink) — shown only while armed (`isTargetingAbility`), scoped to range-1 valid targets per ability kind via `getAbilityTargets()` (new helper in `src/game/movement.ts`)
- [x] Action log entries for ability use (client-side `useAbility()` pushes the same log message shape the server already produces)
- [x] Summon roster in `SidePanel.tsx` (the only live summon UI — `MonsterRoster.tsx` turned out to be dead/unreferenced code, not mounted anywhere, so it was left untouched rather than wired up for no reason) filtered to the player's own loadout via new `useSummonableTypes()` hook + new `src/store/profileStore.ts` (hydrated from `/auth/me`'s `profile` field, which Phase I already returned but nothing consumed until now)
- [x] `useAiController.ts`: **no changes made, deliberately.** The campaign AI (player2) only ever summons from `MONSTER_TYPE_ORDER`, which does not include `white_mage`/`black_mage` and is explicitly unaffected by the loadout system (confirmed decision, see `docs/SHOP_ECONOMY_SPEC.md`). The AI can therefore never end up controlling a monster with a `skills` entry, so "AI logic for when to use an ability" has no reachable code path to write — adding speculative branches for a monster the AI can never own would be untested dead code. If campaign AI ever gets shop access in the future, this would need revisiting.
- [x] Smoke test (offline): full match with a White Mage creating a path and a Black Mage destroying one, campaign mode — confirmed working
- [x] Smoke test (online): same scenario in PvP — confirmed working

---

## Phase V — Profile Screen (Shop / Loadout / Stats tabs) ✅ (code complete, smoke test passed)

- [x] New `AppScreen: 'profile'` in `campaignStore.ts` (`goToProfile()`), "👤 Profile" button on `TitleScreen.tsx`, routed in `App.tsx`
- [x] `src/components/screens/ProfileScreen.tsx` with 3 tabs (Shop / Loadout / Stats), styled consistently with `UpdatesScreen.tsx`
- [x] Shop tab: all 7 monsters via `ALL_MONSTER_TYPES`, Starter/Owned/Buy states, price from new `src/constants/economy.ts` (client mirror of `server/game/economy.ts`), purchase button → `POST /shop/purchase` (new `purchaseMonster()` in `authClient.ts`), updates `profileStore` from the response
- [x] Loadout tab: toggle exactly `LOADOUT_SIZE` (5) of `ownedMonsters`, disabled once at cap, Save button → `PUT /loadout` (new `putLoadout()`), updates `profileStore`
- [x] Stats tab: read-only win/loss display from `profileStore.stats` (new — `profileStore.ts` extended to also hold `stats`, hydrated alongside `profile` in `authStore.ts`'s bootstrap/login/signup). Originally split Campaign vs PvP; the Campaign half was removed later, see "Post-Ship Tweaks".
- [x] `tsc --noEmit` passes clean
- [x] Smoke test: purchase a monster, add it to loadout, summon it in a match — confirmed working against the real local server + Postgres

---

## Phase VI — Gold + Stats Recording ✅ (code complete, manual smoke tests passed)

- [x] PvP: `server/rooms.ts`'s `emitGameOver()` (the single choke point for every end-of-match path — normal win, timer-forced end, quit, disconnect forfeit) now calls the exported `applyMatchResult()` from `server/profile.ts` for both the winner and loser, fire-and-forget with logged errors. No REST round-trip needed since it's already server-side.
- [x] Campaign: the win reward now rides along on the existing `PUT /campaign-progress` call (see "Post-Review Fixes" below — this replaced an earlier, exploitable `POST /match-result` design). Loss is reported via `POST /campaign-loss` (0G either way, but still counts toward `campaignLosses` in Stats).
- [x] **Found and fixed a real bug while implementing this**: `POST /shop/purchase`, `PUT /loadout`, and `applyMatchResult()` all assumed a `PlayerProfile`/`MatchStats` row already exists (`findUnique` returning 404, or a plain Prisma `update` which throws P2025 on a missing row). Both are only created in the signup transaction — so any account created **before** this feature shipped would 404/500 on every one of these endpoints forever. Fixed by switching all three to `upsert` (lazily backfills the default row on first access) instead of `findUnique`/`update`.
- [x] `tsc --noEmit` passes clean on both client and server
- [x] Smoke test (partial): played a real campaign match, confirmed Gold is awarded on winning a chapter (first clear) — the core `PUT /campaign-progress` → `applyMatchResult` gold-award path works end-to-end against the real server + Postgres
- [x] Smoke test (remaining): confirm replaying an already-cleared campaign stage does NOT add gold; play a full PvP match and confirm gold/stats update correctly there too — confirmed working

---

## Post-Review Fixes

A full code review (8 finder angles + direct verification) was run after Phase VI. 10 findings, all addressed:

- [x] **Crash risk**: `server/index.ts`'s `join_room` handler didn't catch `handleJoinRoom`'s (now-async) rejection — an unhandled rejection crashes the whole Node process on a transient DB error. Fixed with `.catch()` + a `room_error` emit.
- [x] **Double-award**: PvP forfeit endings (`handleQuit`, disconnect timeout) never set a "match is over" flag, so a real win racing a pending forfeit — or the disconnect timer simply outliving the match — could call `recordPvpResult` twice for one match. Fixed: added `Room.matchEnded`, checked/set inside `emitGameOver` (the single choke point), and pending disconnect timers are now cleared whenever a match ends by any other means.
- [x] **Gold farming (the big one)**: `POST /match-result { mode, outcome }` trusted a client-supplied claim with no server-side proof a campaign stage was cleared — callable directly (curl/devtools) to farm unlimited gold. **Redesigned**: the campaign-win reward now rides along on the existing `PUT /campaign-progress` write, gated on that write *itself* genuinely advancing `highestUnlocked` (computed atomically via a CTE comparing the pre- and post-write value — no trust in a separately-asserted "I won"). The generic endpoint is gone; `POST /campaign-loss` (no body, hardcoded to `campaign`+`loss`, 0G reward) is the only remaining client-triggerable report, and it's harmless to spam since there's nothing to farm. PvP was never affected (always recorded server-side, never via REST).
- [x] **Missing offline enforcement**: the client's offline/Campaign `summonMonster` had no loadout check at all — only the UI hid non-loadout buttons. Server-side (PvP) already had this check. Added the same check client-side, skipped for the AI's turn (`aiEnabled && activePlayer === 'player2'`) since the campaign AI is deliberately unaffected by loadouts.
- [x] **Dropped disconnect**: `handleJoinRoom`'s new `await` (fetching loadouts) opened a window where both players had joined but `room.state` was still null; a disconnect in that window returned early and was never handled, silently stranding the other player. Fixed: `handleDisconnect` now handles the `!room.state` case explicitly (tears the room down, notifies via `room_error`) instead of silently returning, and `handleJoinRoom` re-checks the room still exists after its `await` before resurrecting a match.
- [x] **UI state bug**: arming an ability (`isTargetingAbility`) then clicking an attackable enemy set `pendingAttackTargetId` without clearing it, so cancelling the resulting attack preview dropped the player back into armed-ability-targeting mode instead of the plain combat menu. Fixed: `setPendingAttackTarget` now also clears `isTargetingAbility`.
- [x] **Efficiency**: `POST /shop/purchase` made 3 sequential DB round-trips; the final `findUnique` was fully redundant (its values were already derivable). Removed.
- [x] **Accepted, not changed** — retry non-idempotency (`profileStore`'s campaign-loss retry could double-count a loss if the response is lost after a successful write): now low-severity given the gold-farming fix above (loss carries 0G, so this only risks a stats off-by-one, not an exploit) — not worth a full idempotency-key system for that.
- [x] **Accepted, not changed** — `ABILITY_DEFINITIONS` duplicated between `server/game/abilities.ts`/`src/constants/abilities.ts` with only a comment enforcing sync: matches this project's existing, deliberate client/server duplication convention (`MONSTER_TEMPLATES`, `movement.ts`, `combat.ts` are all duplicated the same way) — singling this one pair out for a different pattern (e.g. moving it into `shared/types.ts`, which today holds only compiled-away types, not runtime values) would be inconsistent with the rest of the codebase, not a genuine fix.
- [x] Documentation staleness (this doc, `CLAUDE.md`, `GDD.md`, the two spec docs) — see Final Checks below.

---

## Final Checks

- [x] Existing accounts (created before this migration) get correct defaults (5 starters owned/loadout, 0 gold, 0/0 stats) with no manual backfill needed — verified: `GET /auth/me`/login/signup already had `??` fallbacks for a missing row, and the Phase VI fix (`upsert` instead of `findUnique`/`update`) makes the write endpoints self-heal the same way on first access
- [x] Campaign AI opponent behavior is unchanged — confirmed by inspection: `src/game/useAiController.ts` and `src/game/ai.ts` have zero references to `profileStore` or any loadout concept; the AI still only ever reads `MONSTER_TYPE_ORDER`
- [x] PvP: two accounts with different loadouts can both summon only their own loadout's monsters — server rejects out-of-loadout summon attempts — confirmed working with two real accounts
- [x] Update `CLAUDE.md` and `GDD.md` Path Rules ("Placement is permanent") to note the Black Mage exception — done as part of the post-review doc pass, ahead of the original plan to defer this until after a play session, since the code review already surfaced the inconsistency
- [x] Update `CLAUDE.md` version number + `docs/UPDATE_HISTORY` entry per the project's versioning convention — bumped to 0.3.0 (minor bump per semver's pre-1.0 convention, not the 1.0 milestone), mirrored in `package.json` and `server/package.json`

---

## Post-Ship Tweaks

- [x] Shop tab now lists only the purchasable monsters (`SHOP_MONSTER_TYPES`) — the 5 starters were shown with a "Starter" badge and no buy button, which was pointless clutter. Removed that branch entirely from `ProfileScreen.tsx`.
- [x] Title screen: "👤 Profile" moved to right below "⚔ Campaign" (was at the bottom of the list).
- [x] Login/Signup: added a 👁/🙈 show/hide toggle to all password fields (Login's password, Signup's password + confirm password).
- [x] **Removed `campaignWins`/`campaignLosses` from `MatchStats` entirely** (new migration `20260712000000_remove_campaign_stats`) — there's no meaningful campaign win/loss record for a single-player mode against a fixed AI ramp. This simplified `applyMatchResult()` (campaign branch now only touches `PlayerProfile.gold`, no `MatchStats` write at all), removed the now-fully-pointless `POST /campaign-loss` endpoint and `profileStore`'s retry-wrapped reporting logic entirely (a campaign loss has nothing left to report — 0G, no stat), and simplified the Stats tab to PvP-only. The campaign-win Gold reward (10G on first clear) is unaffected — that's a `PlayerProfile.gold` concern, not a `MatchStats` one.

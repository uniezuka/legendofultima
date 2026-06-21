import { useState, useEffect } from 'react'
import { useGameStore, selectReachableCells, selectAttackTargets, selectMustActMonsters } from '../../store/gameStore'
import type { PlayerId } from '../../types/game'
import type { MonsterType } from '../../types/monster'
import { MONSTER_TEMPLATES, MONSTER_TYPE_ORDER } from '../../constants/monsters'
import { LUCK_SPEND_COST } from '../../constants/board'
import { resolveCombat } from '../../game/combat'
import DiceFace from './DiceFace'

interface Props {
  playerId: PlayerId
}

// ── Shared mini path shape preview ────────────────────────────────────────────
function ShapePreview({ cells, rotation }: { cells: { row: number; col: number }[]; rotation: number }) {
  function rotateCoord(r: number, c: number, times: number): [number, number] {
    let row = r, col = c
    for (let i = 0; i < times; i++) { const t = row; row = col; col = -t }
    return [row, col]
  }
  const times = ((rotation / 90) % 4 + 4) % 4
  const rotated = cells.map(c => rotateCoord(c.row, c.col, times))
  const minR = Math.min(...rotated.map(([r]) => r))
  const minC = Math.min(...rotated.map(([, c]) => c))
  const norm = rotated.map(([r, c]) => [r - minR, c - minC] as [number, number])
  const rows = Math.max(...norm.map(([r]) => r)) + 1
  const cols = Math.max(...norm.map(([, c]) => c)) + 1
  const set = new Set(norm.map(([r, c]) => `${r},${c}`))
  return (
    <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${cols}, 10px)` }}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <div key={`${r}-${c}`} className={`w-2.5 h-2.5 rounded-sm ${set.has(`${r},${c}`) ? 'bg-yellow-400' : 'bg-transparent'}`} />
        ))
      )}
    </div>
  )
}

export default function SidePanel({ playerId }: Props) {
  const activePlayer = useGameStore(s => s.activePlayer)
  const phase = useGameStore(s => s.phase)
  const player = useGameStore(s => s.players[playerId])
  const monsters = useGameStore(s => s.monsters)
  const selectedMonsterId = useGameStore(s => s.selectedMonsterId)
  const selectedMonsterTemplateType = useGameStore(s => s.selectedMonsterTemplateType)
  const generatedPaths = useGameStore(s => s.generatedPaths)
  const selectedPathId = useGameStore(s => s.selectedPathId)
  const pathRotation = useGameStore(s => s.selectedPathRotation)
  const diceRoll = useGameStore(s => s.currentDiceRoll)

  const pendingAttackTargetId = useGameStore(s => s.pendingAttackTargetId)

  const rollDice = useGameStore(s => s.rollDice)
  const spendLuck = useGameStore(s => s.spendLuck)
  const selectPath = useGameStore(s => s.selectPath)
  const setRotation = useGameStore(s => s.setPathRotation)
  const skipPath = useGameStore(s => s.skipPathPlacement)
  const selectTemplate = useGameStore(s => s.selectMonsterTemplate)
  const doneSummoning = useGameStore(s => s.doneSummoning)
  const defendMonster = useGameStore(s => s.defendMonster)
  const skipMove = useGameStore(s => s.skipMove)
  const skipCombat = useGameStore(s => s.skipCombat)
  const selectMonster = useGameStore(s => s.selectMonster)
  const setPendingAttackTarget = useGameStore(s => s.setPendingAttackTarget)
  const attackTarget = useGameStore(s => s.attackTarget)
  const doneMonsterActions = useGameStore(s => s.doneMonsterActions)
  const forceEndMonsterActions = useGameStore(s => s.forceEndMonsterActions)
  const advancePhase = useGameStore(s => s.advancePhase)

  const [showEndConfirm, setShowEndConfirm] = useState(false)

  // Close the confirm dialog if the phase changes away from monsterActions
  // (e.g. AI advances the turn while dialog is open)
  useEffect(() => {
    if (phase !== 'monsterActions') setShowEndConfirm(false)
  }, [phase])

  const reachable = useGameStore(selectReachableCells)
  const attackTargets = useGameStore(selectAttackTargets)
  const mustActMonsters = useGameStore(selectMustActMonsters)

  const aiEnabled = useGameStore(s => s.aiEnabled)

  const isP1 = playerId === 'player1'
  const isActive = activePlayer === playerId
  const isAiControlled = aiEnabled && !isP1  // player2 in campaign mode
  const accentBorder = isP1 ? 'border-blue-600' : 'border-red-600'
  const accentBg = isP1 ? 'bg-blue-950' : 'bg-red-950'
  const accentText = isP1 ? 'text-blue-300' : 'text-red-300'
  const activeBg = isActive ? (isP1 ? 'bg-blue-900/30' : 'bg-red-900/30') : ''

  // Selected monster for action panel
  const selectedMonster = selectedMonsterId ? monsters[selectedMonsterId] : null
  const showActionPanel = isActive && phase === 'monsterActions' && selectedMonster

  return (
    <div className={`w-52 flex-shrink-0 flex flex-col border-r ${isP1 ? '' : 'border-l border-r-0'} ${accentBorder} ${accentBg} ${activeBg} min-h-full`}>

      {/* ── Player header ─────────────────────────────────── */}
      <div className={`px-3 py-2 border-b ${accentBorder}`}>
        <div className="flex items-center justify-between">
          <span className={`font-black text-sm ${accentText}`}>
            {isP1 ? 'Player 1' : 'Player 2'}
          </span>
          {isActive && (
            <span className="text-[10px] font-bold text-yellow-300 bg-yellow-900/50 px-1.5 py-0.5 rounded">▶ TURN</span>
          )}
        </div>

        {/* Base HP */}
        <div className="flex items-center gap-0.5 mt-1">
          <span className="text-gray-500 text-[10px] mr-1">Base</span>
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={`text-base ${i < player.baseHp ? 'text-red-400' : 'text-gray-700'}`}>♥</span>
          ))}
        </div>

        {/* Mana + Luck */}
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <span className="text-blue-400 text-[10px]">Mana</span>
            <span className="text-white font-mono font-bold text-sm">{player.mana}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-yellow-400 text-[10px]">Luck</span>
            <span className="text-white font-mono font-bold text-sm">{player.luck}</span>
          </div>
        </div>

        {/* Monster count */}
        <div className="text-gray-400 text-[10px] mt-0.5">
          Monsters: <span className="text-white">{player.monsterCount}/8</span>
        </div>
      </div>

      {/* ── Active player controls ─────────────────────────── */}
      {isActive && (
        <div className={`flex flex-col gap-2 px-3 py-3 overflow-y-auto ${isAiControlled ? 'pointer-events-none select-none opacity-70' : ''}`}>

          {/* Phase 3: Roll Dice */}
          {phase === 'rollDice' && (
            <div className="flex flex-col gap-2">
              <span className="text-gray-400 text-xs font-semibold">Roll Dice</span>
              {diceRoll === null ? (
                <button onClick={rollDice}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-sm">
                  🎲 Roll
                </button>
              ) : (
                <>
                  <DiceFace value={diceRoll} size={64} className="mx-auto drop-shadow-lg" />
                  <button onClick={advancePhase}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-bold">
                    Place Path →
                  </button>
                </>
              )}
            </div>
          )}

          {/* Phase 4: Place Path */}
          {phase === 'placePath' && (
            <div className="flex flex-col gap-2">
              <span className="text-gray-400 text-xs font-semibold">Place Path</span>

              {/* Dice result + luck adjustment */}
              <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5">
                <DiceFace value={diceRoll ?? 1} size={40} className="drop-shadow" />
                <div className="flex flex-col gap-1">
                  <button onClick={() => spendLuck(1)}
                    disabled={player.luck < LUCK_SPEND_COST || (diceRoll ?? 0) >= 6}
                    className="px-2 py-0.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs rounded leading-tight">
                    +1
                  </button>
                  <button onClick={() => spendLuck(-1)}
                    disabled={player.luck < LUCK_SPEND_COST || (diceRoll ?? 0) <= 1}
                    className="px-2 py-0.5 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white text-xs rounded leading-tight">
                    −1
                  </button>
                </div>
                <span className="text-yellow-600 text-[10px] leading-tight">
                  {player.luck >= LUCK_SPEND_COST
                    ? `${player.luck} luck\n(spend 3)`
                    : `${player.luck} luck`}
                </span>
              </div>

              {generatedPaths.map(path => {
                const isMatch = path.cost === diceRoll
                const isSel = path.id === selectedPathId
                return (
                  <button key={path.id} onClick={() => isMatch && selectPath(path.id)}
                    disabled={!isMatch}
                    className={`flex items-center gap-2 p-2 rounded border transition-colors text-left
                      ${!isMatch ? 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'
                        : isSel ? 'border-yellow-400 bg-yellow-900/50 ring-1 ring-yellow-400 cursor-pointer'
                          : 'border-yellow-600 bg-gray-800 hover:bg-gray-700 cursor-pointer'}`}>
                    <ShapePreview cells={path.shape.cells} rotation={isSel ? pathRotation : 0} />
                    <div>
                      <div className={`text-xs font-bold ${isMatch ? 'text-yellow-300' : 'text-gray-500'}`}>
                        Cost: {path.cost}
                      </div>
                      <div className="text-gray-400 text-[10px]">{path.shape.name}</div>
                    </div>
                  </button>
                )
              })}

              {selectedPathId && (
                <button onClick={() => setRotation((pathRotation + 90) % 360)}
                  className="w-full py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded">
                  ↻ Rotate 90°
                </button>
              )}

              {selectedPathId && (
                <p className="text-gray-500 text-[10px] text-center">Hover board to preview • click to place</p>
              )}

              <button onClick={skipPath}
                className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded mt-1">
                Skip (+1 Luck)
              </button>
            </div>
          )}

          {/* Phase 5: Summon Monster */}
          {phase === 'summonMonster' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-gray-400 text-xs font-semibold">Summon Monster</span>

              {MONSTER_TYPE_ORDER.map((type: MonsterType) => {
                const t = MONSTER_TEMPLATES[type]
                const canAfford = player.mana >= t.cost
                const atCap = player.monsterCount >= 8
                const disabled = !canAfford || atCap
                const isSel = selectedMonsterTemplateType === type
                return (
                  <button key={type} onClick={() => !disabled && selectTemplate(type)}
                    disabled={disabled}
                    className={`flex items-center gap-2 p-1.5 rounded border text-left transition-colors
                      ${disabled ? 'border-gray-700 bg-gray-900 opacity-40 cursor-not-allowed'
                        : isSel ? 'border-purple-400 bg-purple-900/40 ring-1 ring-purple-400 cursor-pointer'
                          : 'border-gray-600 bg-gray-800 hover:bg-gray-700 cursor-pointer'}`}>
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 relative bg-gray-900">
                      <img
                        src={`/assets/monsters/${type}/idle.png`}
                        alt={t.label}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                      <div className={`absolute inset-0 ${isP1 ? 'bg-blue-500/20' : 'bg-red-500/20'} pointer-events-none`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-300 text-xs font-bold">{t.label}</span>
                        <span className="text-blue-300 text-[10px]">{t.cost}✦</span>
                      </div>
                      <div className="text-gray-400 text-[10px]">
                        HP:{t.hp} ATK:{t.atk} DEF:{t.def} MV:{t.move}{t.range > 1 ? ` R:${t.range}` : ''}
                      </div>
                    </div>
                  </button>
                )
              })}

              {selectedMonsterTemplateType && (
                <p className="text-gray-500 text-[10px] text-center">Hover board to preview • click to place</p>
              )}

              <button onClick={doneSummoning}
                className="w-full py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded font-bold mt-1">
                Done Summoning →
              </button>
            </div>
          )}

          {/* Phase 6: Monster Actions */}
          {phase === 'monsterActions' && !showActionPanel && (
            <div className="flex flex-col gap-2">
              <span className="text-gray-400 text-xs font-semibold">Monster Actions</span>
              {mustActMonsters.length > 0 ? (
                <>
                  <p className="text-amber-400 text-[10px] font-semibold">
                    {mustActMonsters.length} monster{mustActMonsters.length > 1 ? 's' : ''} still need to act:
                  </p>
                  {mustActMonsters.map(m => (
                    <span key={m.id} className="text-amber-300 text-[10px] capitalize">• {m.type}</span>
                  ))}
                  <p className="text-gray-500 text-[10px]">Click a glowing monster to select it.</p>
                </>
              ) : (
                <p className="text-green-400 text-[10px]">All monsters have acted.</p>
              )}
              <button
                onClick={() => mustActMonsters.length > 0 ? setShowEndConfirm(true) : doneMonsterActions()}
                className="w-full py-1.5 text-white text-sm rounded font-bold mt-auto bg-green-700 hover:bg-green-600"
              >
                Done Actions →
              </button>

              {/* Confirmation dialog */}
              {showEndConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                  <div className="bg-gray-900 border border-amber-500 rounded-lg p-5 w-72 shadow-2xl flex flex-col gap-3">
                    <p className="text-amber-400 font-bold text-sm">Skip remaining monsters?</p>
                    <p className="text-gray-300 text-xs">
                      {mustActMonsters.length} monster{mustActMonsters.length > 1 ? 's have' : ' has'} not acted yet:
                    </p>
                    <ul className="text-amber-300 text-xs flex flex-col gap-0.5">
                      {mustActMonsters.map(m => (
                        <li key={m.id} className="capitalize">• {m.type}</li>
                      ))}
                    </ul>
                    <p className="text-gray-400 text-[10px]">End turn anyway? Unacted monsters will forfeit their actions.</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => { setShowEndConfirm(false); forceEndMonsterActions() }}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded font-bold"
                      >
                        End Turn
                      </button>
                      <button
                        onClick={() => setShowEndConfirm(false)}
                        className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 6: Monster selected — 2-step action UI */}
          {showActionPanel && selectedMonster && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-bold capitalize">{selectedMonster.type}</span>
                <button onClick={() => selectMonster(null)}
                  className="text-gray-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="text-gray-400 text-[10px]">
                HP:{selectedMonster.currentHp}/{selectedMonster.maxHp} ATK:{selectedMonster.atk} DEF:{selectedMonster.def}
                {selectedMonster.state === 'defending' && <span className="text-cyan-300 ml-1">🛡</span>}
              </div>

              {/* Step 1: Movement */}
              {!selectedMonster.hasMoved && (
                <>
                  <div className="text-purple-300 text-xs font-bold">Step 1: Movement</div>
                  {reachable.length > 0
                    ? <p className="text-green-400 text-[10px]">Click a green cell to move</p>
                    : <p className="text-gray-500 text-[10px]">No reachable cells</p>
                  }
                  <button onClick={skipMove}
                    className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded font-bold">
                    Stay (Skip Move)
                  </button>
                </>
              )}

              {/* Step 2: Combat */}
              {selectedMonster.hasMoved && !selectedMonster.hasActedThisTurn && (() => {
                const pendingTarget = pendingAttackTargetId ? monsters[pendingAttackTargetId] : null
                const preview = pendingTarget ? resolveCombat(selectedMonster, pendingTarget) : null

                if (preview && pendingTarget) {
                  const tHpAfter = pendingTarget.currentHp - preview.defenderDamage
                  const aHpAfter = selectedMonster.currentHp - preview.attackerDamage
                  return (
                    <>
                      <div className="text-orange-300 text-xs font-bold">⚔ Attack Preview</div>
                      <div className="bg-gray-800 rounded p-2 text-[10px] flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400 capitalize">{selectedMonster.type}</span>
                          <span className="text-gray-400 capitalize">{pendingTarget.type}</span>
                        </div>
                        <div className="flex justify-between font-mono">
                          <span className={preview.attackerDamage > 0 ? 'text-red-400' : 'text-white'}>
                            {preview.attackerDamage > 0 ? `−${preview.attackerDamage} HP` : 'safe'}
                          </span>
                          <span className="text-gray-600">vs</span>
                          <span className={preview.defenderDamage > 0 ? 'text-red-400' : preview.defenderBreaksShield ? 'text-orange-400' : 'text-yellow-400'}>
                            {preview.defenderDamage > 0
                              ? `−${preview.defenderDamage} HP`
                              : preview.defenderBreaksShield
                                ? 'shield ×'
                                : `shield −${selectedMonster.atk}`}
                          </span>
                        </div>
                        {preview.defenderBreaksShield && pendingTarget.state === 'defending' && (
                          <div className="text-orange-300 text-[10px]">Shield breaks → goes Idle</div>
                        )}
                        <div className="flex justify-between text-gray-500 pt-0.5 border-t border-gray-700">
                          <span>After: {Math.max(0, aHpAfter)}/{selectedMonster.maxHp} HP</span>
                          <span>After: {Math.max(0, tHpAfter)}/{pendingTarget.maxHp} HP</span>
                        </div>
                      </div>
                      <button
                        onClick={() => attackTarget(pendingAttackTargetId!)}
                        className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded font-bold"
                      >
                        Confirm Attack
                      </button>
                      <button
                        onClick={() => setPendingAttackTarget(null)}
                        className="w-full py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
                      >
                        Cancel
                      </button>
                    </>
                  )
                }

                return (
                  <>
                    <div className="text-orange-300 text-xs font-bold">Step 2: Combat</div>
                    {attackTargets.length > 0 && (
                      <p className="text-orange-400 text-[10px]">Click an orange enemy to preview attack</p>
                    )}
                    {selectedMonster.lastAction !== 'defend' && (
                      <button onClick={defendMonster}
                        className="w-full py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded font-bold">
                        🛡 Defend
                      </button>
                    )}
                    <button onClick={skipCombat}
                      className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded font-bold">
                      Skip Combat
                    </button>
                  </>
                )
              })()}

              <button
                onClick={() => mustActMonsters.length > 0 ? setShowEndConfirm(true) : doneMonsterActions()}
                className="w-full py-1.5 text-white text-xs rounded font-bold mt-1 bg-green-700 hover:bg-green-600"
              >
                Done Actions →
              </button>
            </div>
          )}

          {/* Phase 7: End Turn */}
          {phase === 'endTurn' && (
            <button onClick={advancePhase}
              className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-black rounded">
              End Turn →
            </button>
          )}

        </div>
      )}
    </div>
  )
}

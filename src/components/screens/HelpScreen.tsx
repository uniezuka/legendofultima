import { type ReactNode } from 'react'
import { useCampaignStore } from '../../store/campaignStore'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-yellow-400 font-bold text-lg border-b border-yellow-400/30 pb-1 mb-3">{title}</h2>
      {children}
    </div>
  )
}

interface PhaseCardProps {
  step: number
  title: string
  badge: 'auto' | 'player'
  color: string
  children: ReactNode
}

function PhaseCard({ step, title, badge, color, children }: PhaseCardProps) {
  const badgeStyle = badge === 'auto'
    ? 'bg-gray-700 text-gray-400 border-gray-600'
    : 'bg-yellow-900/60 text-yellow-300 border-yellow-700'

  return (
    <div className={`bg-gray-900/70 rounded-xl border ${color} p-4 flex gap-4`}>
      <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-white font-black text-sm">
          {step}
        </div>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
          {badge === 'auto' ? 'AUTO' : 'YOU'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold mb-1">{title}</p>
        <div className="text-sm text-gray-300 space-y-1">{children}</div>
      </div>
    </div>
  )
}

function MonsterRow({ name, cost, hp, atk, def, mov, rng }: {
  name: string; cost: number; hp: number; atk: number; def: number; mov: number; rng: number
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-800 last:border-0 text-sm">
      <span className="text-white font-semibold w-16 flex-shrink-0">{name}</span>
      <span className="text-purple-400 w-14 flex-shrink-0">{cost} mana</span>
      <div className="flex gap-3 text-gray-400 flex-wrap">
        <span><span className="text-green-400">HP</span> {hp}</span>
        <span><span className="text-red-400">ATK</span> {atk}</span>
        <span><span className="text-cyan-400">DEF</span> {def}</span>
        <span><span className="text-blue-400">MOV</span> {mov}</span>
        <span><span className="text-yellow-400">RNG</span> {rng}</span>
      </div>
    </div>
  )
}

export default function HelpScreen() {
  const returnToTitle = useCampaignStore(s => s.returnToTitle)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-10 px-4 relative overflow-auto"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-yellow-400 text-3xl font-black drop-shadow">How to Play</h1>
          <button
            onClick={returnToTitle}
            className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-lg border border-gray-600 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Screenshot placeholder */}
        <div className="w-full aspect-video bg-gray-900/80 border-2 border-dashed border-gray-600 rounded-xl flex items-center justify-center">
          <p className="text-gray-500 text-sm">[ Game screenshot ]</p>
        </div>

        {/* Goal */}
        <Section title="Goal">
          <p className="text-gray-300 text-sm leading-relaxed">
            Breach the enemy base <span className="text-red-400 font-bold">3 times</span> to win.
            Each player starts with <span className="text-white font-semibold">3 Base HP</span>.
            Move monsters onto the enemy base tile and attack it to deal damage.
            The first player to reduce the opponent's base to 0 HP wins.
          </p>
        </Section>

        {/* Board Layout */}
        <Section title="Board Layout">
          <div className="flex gap-6 items-start">
            {/* Mini board diagram */}
            <div className="flex-shrink-0 flex flex-col items-center gap-0.5 text-xs font-mono">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${i === 2 ? 'bg-red-500' : 'bg-gray-800 border border-gray-700'}`} />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, row) => (
                <div key={row} className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, col) => (
                    <div key={col} className={`w-4 h-4 rounded-sm ${
                      (row === 1 && col === 2) || (row === 2 && col === 2) ? 'bg-red-900/60 border border-red-800' :
                      (row === 3 && col === 2) || (row === 4 && col === 2) ? 'bg-blue-900/60 border border-blue-800' :
                      'bg-gray-800 border border-gray-700'
                    }`} />
                  ))}
                </div>
              ))}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${i === 2 ? 'bg-blue-500' : 'bg-gray-800 border border-gray-700'}`} />
                ))}
              </div>
              <p className="text-gray-600 mt-1">11×15 board</p>
            </div>

            {/* Explanation */}
            <div className="text-sm text-gray-300 space-y-2">
              <p>The board is <span className="text-white font-semibold">11 columns × 15 rows</span>. Both bases sit in the center column.</p>
              <div className="space-y-1">
                <p><span className="inline-block w-3 h-3 rounded-sm bg-blue-500 mr-2 align-middle" />
                  <span className="text-blue-300 font-semibold">Player 1 (Blue)</span> — base at bottom center</p>
                <p><span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-2 align-middle" />
                  <span className="text-red-300 font-semibold">Player 2 (Red)</span> — base at top center</p>
              </div>
              <p>All other tiles start as empty grass. <span className="text-yellow-300 font-semibold">Monsters cannot walk on grass</span> — you must build a path network first. Extend your paths turn by turn toward the enemy base so your monsters can advance.</p>
              <p className="text-gray-500 text-xs">Monsters can travel on any path tile regardless of color — once you're adjacent to enemy-colored tiles, your monsters can cross onto them freely.</p>
            </div>
          </div>
        </Section>

        {/* Turn Phases */}
        <Section title="Turn Phases">
          <div className="flex flex-col gap-3">

            <PhaseCard step={1} title="Generate Mana" badge="auto" color="border-gray-700">
              <p>You automatically gain <span className="text-purple-400 font-semibold">+1 Mana</span> at the start of your turn. Mana carries over — unspent mana is never lost.</p>
              <p className="text-gray-500">Starting Mana: 3. You'll gain 1 more each turn, letting you summon stronger monsters over time.</p>
            </PhaseCard>

            <PhaseCard step={2} title="Generate Paths" badge="auto" color="border-gray-700">
              <p>Three path cards are automatically drawn for you. Each card has a unique <span className="text-white font-semibold">shape</span> (I, L, T, Cross, Corner, S) and a unique <span className="text-white font-semibold">cost (1–6)</span>.</p>
              <p className="text-gray-500">All 3 shapes are always different. All 3 costs are always different — so at most one path can match your dice roll.</p>
            </PhaseCard>

            <PhaseCard step={3} title="Roll Dice" badge="player" color="border-yellow-800/60">
              <p>Click <span className="text-yellow-300 font-semibold">Roll</span> to roll a single six-sided die (1–6). The result determines which path you can place this turn.</p>
              <p className="text-gray-500">The die is shown on your side panel. Whatever number you roll, look for the path card with the matching cost.</p>
            </PhaseCard>

            <PhaseCard step={4} title="Place Path" badge="player" color="border-yellow-800/60">
              <p>If a path card's cost matches your roll, click it to select it. Then hover over the board to see a preview — <span className="text-yellow-300 font-semibold">yellow = valid</span>, <span className="text-red-400 font-semibold">red = invalid</span>. Click to place.</p>
              <p>Use the <span className="text-blue-300 font-semibold">Rotate</span> button to spin the shape 90° before placing. Paths must connect to your existing network or your base — you can't place isolated tiles.</p>
              <p>If no path cost matches your roll, placement is skipped and you gain <span className="text-green-400 font-semibold">+1 Luck</span>.</p>
              <p className="text-gray-500">Luck tip: spend <span className="text-green-300 font-semibold">3 Luck</span> to nudge the dice result ±1. You decide this here, after seeing the paths, so you can judge whether it's worth it.</p>
            </PhaseCard>

            <PhaseCard step={5} title="Summon Monster" badge="player" color="border-yellow-800/60">
              <p>Spend mana to place a monster on any path tile adjacent to your base. Select a monster card from your panel and click a valid tile (shown in <span className="text-purple-400 font-semibold">purple</span>).</p>
              <p>Newly summoned monsters enter <span className="text-gray-400 font-semibold">💤 Summoning</span> state — they cannot act until your next turn. You may summon up to <span className="text-white font-semibold">8 monsters</span> at a time (16 total on the board).</p>
              <p className="text-gray-500">You can skip summoning if you want to save mana for a stronger creature next turn.</p>
            </PhaseCard>

            <PhaseCard step={6} title="Monster Actions" badge="player" color="border-yellow-800/60">
              <p>Every monster that isn't 💤 Summoning must complete a <span className="text-white font-semibold">2-step sequence</span>:</p>
              <div className="pl-3 border-l-2 border-gray-700 space-y-1 mt-1">
                <p><span className="text-green-400 font-semibold">Step 1 — Move:</span> Click a highlighted green tile to move, or click "Stay" to skip movement. Monsters travel on any path or base tile — empty grass blocks them.</p>
                <p><span className="text-orange-400 font-semibold">Step 2 — Combat:</span> Attack an enemy in range (shown in orange with ⚔), choose <span className="text-cyan-400 font-semibold">Defend</span> to raise a shield, or skip.</p>
              </div>
              <p className="mt-1">Monsters with a <span className="text-amber-400 font-semibold">amber ring</span> still need to act. A confirmation dialog appears if you try to end the phase early.</p>
              <p className="text-gray-500">Attacking shows a preview panel with expected damage for both sides. Confirm to execute.</p>
            </PhaseCard>

            <PhaseCard step={7} title="End Turn" badge="player" color="border-gray-700">
              <p>Click <span className="text-white font-semibold">End Turn</span> to pass control to your opponent. All monster states are preserved — Defending monsters keep their shield into the next turn.</p>
              <p className="text-gray-500">Make sure all your monsters have acted before ending unless you intend to skip them.</p>
            </PhaseCard>

          </div>
        </Section>

        {/* Monsters */}
        <Section title="Monsters">
          <div className="bg-gray-900/70 rounded-xl border border-gray-700 px-4 py-2">
            <MonsterRow name="Slime"  cost={1} hp={8}  atk={2} def={4} mov={1} rng={1} />
            <MonsterRow name="Goblin" cost={2} hp={5}  atk={5} def={2} mov={2} rng={1} />
            <MonsterRow name="Archer" cost={3} hp={4}  atk={4} def={1} mov={1} rng={2} />
            <MonsterRow name="Knight" cost={4} hp={12} atk={4} def={6} mov={1} rng={1} />
            <MonsterRow name="Dragon" cost={7} hp={15} atk={8} def={5} mov={2} rng={1} />
          </div>
          <p className="text-gray-500 text-xs mt-2">RNG 2 = can attack two tiles away. MOV = tiles moved per turn.</p>
        </Section>

        {/* Combat */}
        <Section title="Combat & Defense">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700 space-y-1">
              <p className="text-white font-bold mb-1">Attacking an Idle monster</p>
              <p>Damage = attacker's ATK. Applied directly to the defender's HP.</p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700 space-y-1">
              <p className="text-cyan-300 font-bold mb-1">🛡 Attacking a Defending monster</p>
              <p>ATK &gt; Shield: excess damage hits HP; shield breaks → Idle.</p>
              <p>ATK &lt; Shield: attacker takes the difference; shield reduced.</p>
              <p>ATK = Shield: no HP damage; shield breaks → Idle.</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-2">Monsters cannot defend twice in a row — they must move or attack first.</p>
        </Section>

        {/* Visual Legend */}
        <Section title="Board Color Guide">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              { dot: 'bg-green-500',              label: 'Green tile',          desc: 'Reachable move destination' },
              { dot: 'bg-orange-500',             label: 'Orange tile + ⚔',     desc: 'Enemy in attack range' },
              { dot: 'bg-purple-500',             label: 'Purple tile',         desc: 'Valid summon location' },
              { dot: 'bg-yellow-400',             label: 'Yellow ghost',        desc: 'Valid path placement preview' },
              { dot: 'bg-red-500',                label: 'Red ghost',           desc: 'Invalid path placement preview' },
              { dot: 'ring-2 ring-white bg-transparent',   label: 'White ring',          desc: 'Currently selected monster' },
              { dot: 'ring-2 ring-amber-400 bg-transparent', label: 'Amber ring',        desc: 'Monster still needs to act' },
              { dot: 'bg-blue-500/60',            label: 'Blue path tint',      desc: 'Player 1 owned path tile' },
              { dot: 'bg-red-500/60',             label: 'Red path tint',       desc: 'Player 2 owned path tile' },
              { dot: 'bg-cyan-400',               label: 'Cyan bar on monster', desc: 'Remaining DEF shield' },
            ].map(({ dot, label, desc }) => (
              <div key={label} className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-800">
                <div className={`w-4 h-4 rounded flex-shrink-0 ${dot}`} />
                <div>
                  <span className="text-white font-semibold">{label}</span>
                  <span className="text-gray-400"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Quick Tips */}
        <Section title="Quick Tips">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: '🛤️',
                tip: 'Build paths toward the center first',
                detail: 'Your monsters are trapped until the path network reaches them. A long path to nowhere is useless — push toward the enemy.',
              },
              {
                icon: '🎲',
                tip: 'Save Luck for critical placements',
                detail: 'Three Luck points to shift a roll ±1 is expensive. Only spend it when the target path would meaningfully advance your position.',
              },
              {
                icon: '🏹',
                tip: 'Archers can attack 2 tiles away',
                detail: 'Place Archers behind a Knight or Slime. They deal damage from safety and are very cost-efficient at 3 mana.',
              },
              {
                icon: '🛡️',
                tip: 'Defending reflects damage back',
                detail: 'If the shield value exceeds the attacker ATK, the attacker takes the difference as counter-damage. Use this to bait enemies into bad trades.',
              },
              {
                icon: '💤',
                tip: 'Summoned monsters are safe this turn',
                detail: 'A monster in Summoning state cannot act but also cannot be meaningfully threatened. Summon early so the monster is ready to act next round.',
              },
              {
                icon: '⚔️',
                tip: 'Always preview before attacking',
                detail: 'The attack preview shows exact HP changes for both sides. Never confirm without checking whether the attack will also hurt your own monster.',
              },
              {
                icon: '🐉',
                tip: 'Save up for the Dragon',
                detail: 'At 7 mana the Dragon is expensive, but 15 HP and 8 ATK can swing the game. Letting mana carry over a turn or two is a valid strategy.',
              },
              {
                icon: '🚶',
                tip: 'Monsters can share enemy paths',
                detail: 'Once your path network is adjacent to an enemy tile, your monsters can cross onto it freely. Ownership of a tile is not required to walk on it.',
              },
            ].map(({ icon, tip, detail }) => (
              <div key={tip} className="bg-gray-900/60 rounded-lg p-3 border border-gray-700 flex gap-3">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{tip}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Game Modes */}
        <Section title="Game Modes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
              <p className="text-yellow-300 font-bold mb-1">⚔ Campaign</p>
              <p>10 stages vs AI. AI difficulty ramps from <span className="text-green-400">Idle</span> → <span className="text-blue-400">Easy</span> → <span className="text-yellow-400">Medium</span> → <span className="text-red-400">Hard</span>. Each win unlocks the next stage.</p>
            </div>
            <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
              <p className="text-blue-300 font-bold mb-1">⚔ Online PvP</p>
              <p>Two human players over a network. Each player has <span className="text-white font-semibold">3 minutes</span> per turn. Disconnecting for 60 seconds forfeits the match.</p>
            </div>
          </div>
        </Section>

        <div className="text-center pb-4">
          <button
            onClick={returnToTitle}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-colors shadow-lg border-2 border-yellow-300"
          >
            Back to Title
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useCampaignStore } from '../../store/campaignStore'
import { useProfileStore } from '../../store/profileStore'
import { purchaseMonster, putLoadout } from '../../network/authClient'
import { MONSTER_TEMPLATES, SHOP_MONSTER_TYPES } from '../../constants/monsters'
import { SHOP_MONSTER_PRICES, LOADOUT_SIZE } from '../../constants/economy'
import { ABILITY_DESCRIPTIONS, getMonsterSkillId } from '../../constants/abilities'

type Tab = 'shop' | 'loadout' | 'stats'

function MonsterIcon({ type }: { type: string }) {
  return (
    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-900">
      <img src={`/assets/monsters/${type}/idle.png`} alt={type} className="w-full h-full object-contain" draggable={false} />
    </div>
  )
}

// Shared by the Shop and Loadout tabs so a monster's ability (if it has one)
// is visible before the player buys it or picks their loadout, not just
// after summoning it mid-match (SidePanel.tsx).
function MonsterCardBody({ type }: { type: string }) {
  const t = MONSTER_TEMPLATES[type]
  const skillId = getMonsterSkillId(type)
  const ability = skillId ? ABILITY_DESCRIPTIONS[skillId] : undefined

  return (
    <div className="flex-1 min-w-0">
      <div className="text-yellow-300 text-sm font-bold">{t.label}</div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] text-gray-500 mt-0.5">
        <span>Cost <b className="text-white font-mono">{t.cost}✦</b></span>
        <span>HP <b className="text-white font-mono">{t.hp}</b></span>
        <span>ATK <b className="text-white font-mono">{t.atk}</b></span>
        <span>DEF <b className="text-white font-mono">{t.def}</b></span>
        <span>MV <b className="text-white font-mono">{t.move}</b></span>
        {t.range > 1 && <span>RNG <b className="text-white font-mono">{t.range}</b></span>}
      </div>
      {ability && (
        <div className="text-cyan-300 text-[10px] mt-0.5">
          🔮 {ability.label} — <span className="text-gray-400">{ability.description}</span>
        </div>
      )}
      {t.passiveDescription && (
        <div className="text-yellow-400 text-[10px] mt-0.5">{t.passiveDescription}</div>
      )}
    </div>
  )
}

function ShopTab() {
  const gold = useProfileStore(s => s.gold)
  const ownedMonsters = useProfileStore(s => s.ownedMonsters)
  const loadout = useProfileStore(s => s.loadout)
  const setProfile = useProfileStore(s => s.setProfile)

  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy(type: string) {
    setError(null)
    setPurchasing(type)
    try {
      const result = await purchaseMonster(type)
      setProfile({ gold: result.gold, ownedMonsters: result.ownedMonsters, loadout })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPurchasing(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-yellow-300 font-bold text-sm">💰 Gold: {gold}</div>
      {error && <p className="text-red-400 text-xs">{error}</p>}

      {SHOP_MONSTER_TYPES.map((type) => {
        const isOwned = ownedMonsters.includes(type)
        const price = SHOP_MONSTER_PRICES[type]

        return (
          <div key={type} className="flex items-center gap-3 p-2 rounded border border-gray-700 bg-gray-900/60">
            <MonsterIcon type={type} />
            <MonsterCardBody type={type} />
            {isOwned ? (
              <span className="text-green-400 text-xs font-semibold px-2 py-1">Owned</span>
            ) : (
              <button
                onClick={() => handleBuy(type)}
                disabled={gold < price || purchasing !== null}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold rounded"
              >
                {purchasing === type ? '...' : `Buy — ${price}G`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LoadoutTab() {
  const ownedMonsters = useProfileStore(s => s.ownedMonsters)
  const loadout = useProfileStore(s => s.loadout)
  const setProfile = useProfileStore(s => s.setProfile)
  const gold = useProfileStore(s => s.gold)

  const [selected, setSelected] = useState<string[]>(loadout)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function toggle(type: string) {
    setSaved(false)
    setSelected(prev => {
      if (prev.includes(type)) return prev.filter(t => t !== type)
      if (prev.length >= LOADOUT_SIZE) return prev
      return [...prev, type]
    })
  }

  async function handleSave() {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const result = await putLoadout(selected)
      setProfile({ gold, ownedMonsters, loadout: result.loadout })
      setSaved(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-400 text-xs">
        Choose exactly {LOADOUT_SIZE} monsters as your active roster ({selected.length}/{LOADOUT_SIZE} selected).
        Used in both Campaign and PvP.
      </p>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {saved && <p className="text-green-400 text-xs">✓ Loadout saved!</p>}

      {ownedMonsters.map((type) => {
        const isSelected = selected.includes(type)
        const disabled = !isSelected && selected.length >= LOADOUT_SIZE
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            disabled={disabled}
            className={`flex items-center gap-3 p-2 rounded border text-left transition-colors
              ${isSelected ? 'border-purple-400 bg-purple-900/40 ring-1 ring-purple-400'
                : disabled ? 'border-gray-800 bg-gray-900/40 opacity-40 cursor-not-allowed'
                  : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}
          >
            <MonsterIcon type={type} />
            <MonsterCardBody type={type} />
            {isSelected && <span className="text-purple-300 text-xs font-bold">✓</span>}
          </button>
        )
      })}

      <button
        onClick={handleSave}
        disabled={selected.length !== LOADOUT_SIZE || saving}
        className="w-full py-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded mt-2"
      >
        {saving ? 'Saving...' : 'Save Loadout'}
      </button>
    </div>
  )
}

function StatsTab() {
  const stats = useProfileStore(s => s.stats)
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded border border-gray-700 bg-gray-900/60 p-4">
        <div className="text-red-300 font-bold text-sm mb-2">Online PvP</div>
        <div className="flex justify-between text-sm">
          <span className="text-green-400">Wins: {stats.pvpWins}</span>
          <span className="text-red-400">Losses: {stats.pvpLosses}</span>
        </div>
      </div>
    </div>
  )
}

export default function ProfileScreen() {
  const returnToTitle = useCampaignStore(s => s.returnToTitle)
  const [tab, setTab] = useState<Tab>('shop')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'shop', label: '🛒 Shop' },
    { id: 'loadout', label: '🔄 Loadout' },
    { id: 'stats', label: '📊 Stats' },
  ]

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-4 py-8 min-h-screen">
        <div className="w-full max-w-lg flex items-center justify-between mb-6">
          <button
            onClick={returnToTitle}
            className="text-gray-400 hover:text-gray-200 text-sm font-semibold transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-yellow-400 text-2xl font-black drop-shadow">Profile</h1>
          <div className="w-16" />
        </div>

        <div className="w-full max-w-sm flex gap-2 mb-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2 text-xs font-bold rounded transition-colors
                ${tab === id ? 'bg-yellow-600 text-black' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-sm overflow-y-auto">
          {tab === 'shop' && <ShopTab />}
          {tab === 'loadout' && <LoadoutTab />}
          {tab === 'stats' && <StatsTab />}
        </div>
      </div>
    </div>
  )
}

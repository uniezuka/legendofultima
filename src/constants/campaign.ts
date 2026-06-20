export type AiDifficulty = 'idle' | 'easy' | 'medium' | 'hard'

export interface CampaignStage {
  id: number
  name: string
  intro: string
  victoryOutro: string
  defeatOutro: string
  difficulty: AiDifficulty
  aiStartingMana: number
}

export const CAMPAIGN_STAGES: CampaignStage[] = [
  {
    id: 1,
    name: 'The First Step',
    intro: 'The dark forces have sent their weakest scouts to test your defenses. Learn to build paths, summon monsters, and breach the enemy base. Victory here opens the road ahead.',
    victoryOutro: 'The scouts scatter. Word reaches the dark council — a new commander stands against them.',
    defeatOutro: 'Even the weakest enemy can win when you are unprepared. Study the path. Try again.',
    difficulty: 'idle',
    aiStartingMana: 3,
  },
  {
    id: 2,
    name: 'Goblin Raid',
    intro: 'A bold goblin warband sweeps down from the hills — fast and reckless. They hit hard but fall easily. Cut them down before they overrun your base.',
    victoryOutro: 'The goblins flee in disarray. Their warchief will not be pleased.',
    defeatOutro: 'Speed and aggression overwhelmed you. Summon faster. Strike first.',
    difficulty: 'idle',
    aiStartingMana: 3,
  },
  {
    id: 3,
    name: 'The Slime Tide',
    intro: 'The marshes churn with slimes. They creep slowly but their thick hides absorb enormous punishment. Overwhelm them before attrition grinds you down.',
    victoryOutro: 'The tide recedes. The marsh falls silent — for now.',
    defeatOutro: 'You let them grind you down. Fight smarter next time.',
    difficulty: 'easy',
    aiStartingMana: 3,
  },
  {
    id: 4,
    name: 'Elven Archers',
    intro: 'Elven sentinels take the high ground and fire from beyond the reach of ordinary monsters. Close the distance before they chip away your entire force.',
    victoryOutro: 'The archers retreat into the forest. Their silence is louder than their arrows.',
    defeatOutro: 'They outranged you at every turn. Build paths faster. Get in close.',
    difficulty: 'easy',
    aiStartingMana: 3,
  },
  {
    id: 5,
    name: 'Iron Vanguard',
    intro: 'A platoon of knights marches in tight formation. Their shields can absorb a dragon strike. Break their defenses with overwhelming force — or wear them down blow by blow.',
    victoryOutro: 'The knights retreat in good order. They will be back, harder and angrier.',
    defeatOutro: 'Shields held. Your line did not. Strike the gaps in their formation.',
    difficulty: 'medium',
    aiStartingMana: 4,
  },
  {
    id: 6,
    name: 'The Mixed Host',
    intro: 'A seasoned battlefield commander fields a balanced force — cheap units to clog the path, ranged units to harass, and heavy hitters in reserve. Adapt or fall.',
    victoryOutro: 'A fine victory against a proper general. Your reputation grows.',
    defeatOutro: 'Outmaneuvered on every axis. Watch the enemy composition. Counter it.',
    difficulty: 'medium',
    aiStartingMana: 4,
  },
  {
    id: 7,
    name: 'Shadow Wardens',
    intro: 'Elite soldiers trained in darkness — every move deliberate, every path calculated. They hold no wasted ground. Match their precision, or be crushed by it.',
    victoryOutro: 'The shadow wardens fall back into the night. Something watches from further darkness.',
    defeatOutro: 'Discipline against discipline. Theirs was stronger. Return and prove yours.',
    difficulty: 'hard',
    aiStartingMana: 4,
  },
  {
    id: 8,
    name: "Dragon's Herald",
    intro: "A dragon circles overhead while its escort of knights advances below. One wrong move and your formation collapses. You cannot afford to lose a single monster carelessly.",
    victoryOutro: 'The dragon retreats, wounded. Its master will send something far worse.',
    defeatOutro: 'The dragon shattered your line before you could recover. Protect your base. Move faster.',
    difficulty: 'hard',
    aiStartingMana: 5,
  },
  {
    id: 9,
    name: 'The Relentless',
    intro: 'Wave after wave. They never stop coming. Your mana will not keep up. Your luck will run dry. Hold the line until there is nothing left of them — or nothing left of you.',
    victoryOutro: 'The final wave breaks. Silence falls over the battlefield. But in the distance, a cold ancient light burns.',
    defeatOutro: 'Numbers swallowed you. Strike early and never stop pressing.',
    difficulty: 'hard',
    aiStartingMana: 5,
  },
  {
    id: 10,
    name: 'The Dark Council',
    intro: 'The architects of every battle finally reveal themselves. Ancient commanders who have studied your every move. They play with no mercy and no mistakes. This is the final test — prove you deserve to stand against them.',
    victoryOutro: 'The Dark Council is silenced. The board grows dark. For now — the realm holds. Until the next game begins.',
    defeatOutro: 'They knew your every move before you made it. Study. Return. You cannot give up now.',
    difficulty: 'hard',
    aiStartingMana: 6,
  },
]

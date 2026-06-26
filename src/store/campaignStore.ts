import { create } from 'zustand'
import { CAMPAIGN_STAGES } from '../constants/campaign'

const STORAGE_KEY = 'lou_campaign_unlocked'

function loadUnlocked(): number {
  try { return Math.max(1, Number(localStorage.getItem(STORAGE_KEY)) || 1) } catch { return 1 }
}

function saveUnlocked(n: number) {
  try { localStorage.setItem(STORAGE_KEY, String(n)) } catch {}
}

export type AppScreen = 'title' | 'campaign-select' | 'campaign-intro' | 'lobby' | 'help'

interface CampaignStore {
  screen: AppScreen
  currentStage: number
  highestUnlocked: number

  goToCampaignSelect: () => void
  selectStage: (id: number) => void
  returnToTitle: () => void
  unlockNextStage: () => void
  goToNextStageIntro: () => void
  goToLobby: () => void
  goToHelp: () => void
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  screen: 'title',
  currentStage: 1,
  highestUnlocked: loadUnlocked(),

  goToCampaignSelect: () => set({ screen: 'campaign-select' }),

  selectStage: (id) => set({ currentStage: id, screen: 'campaign-intro' }),

  returnToTitle: () => set({ screen: 'title' }),

  unlockNextStage: () => {
    const { currentStage, highestUnlocked } = get()
    const newUnlocked = Math.max(highestUnlocked, currentStage + 1)
    saveUnlocked(newUnlocked)
    set({ highestUnlocked: newUnlocked })
  },

  goToLobby: () => set({ screen: 'lobby' }),

  goToHelp: () => set({ screen: 'help' }),

  goToNextStageIntro: () => {
    const { currentStage } = get()
    const nextId = currentStage + 1
    if (nextId <= CAMPAIGN_STAGES.length) {
      set({ currentStage: nextId, screen: 'campaign-intro' })
    } else {
      set({ screen: 'campaign-select' })
    }
  },
}))

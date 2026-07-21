import { create } from 'zustand'
import { CAMPAIGN_STAGES } from '../constants/campaign'
import { putCampaignProgress } from '../network/authClient'
import { useProfileStore } from './profileStore'

export type AppScreen = 'title' | 'campaign-select' | 'campaign-intro' | 'lobby' | 'help' | 'updates' | 'login' | 'signup' | 'profile'

const SYNC_RETRY_ATTEMPTS = 3
const SYNC_RETRY_DELAY_MS = 1000

// Retries a few times on transient failure (dropped connection, cold
// server) before giving up — silently discarding the error entirely would
// leave the optimistic local update as the only copy of the player's
// progress, lost the next time /auth/me overwrites it from server truth.
// The response only carries `gold` when this write genuinely advanced
// highestUnlocked — the server-verified "first clear" — in which case the
// campaign-win Gold reward rides along on this same call instead of a
// separate, independently-forgeable "I won" report (see docs/SHOP_ECONOMY_SPEC.md).
async function syncCampaignProgress(highestUnlocked: number, attempt = 1): Promise<void> {
  try {
    const result = await putCampaignProgress(highestUnlocked)
    if (result.gold !== undefined) {
      const profile = useProfileStore.getState()
      profile.setProfile({ gold: result.gold, ownedMonsters: profile.ownedMonsters, loadout: profile.loadout })
    }
  } catch (err) {
    if (attempt < SYNC_RETRY_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, SYNC_RETRY_DELAY_MS * attempt))
      return syncCampaignProgress(highestUnlocked, attempt + 1)
    }
    console.error('Failed to sync campaign progress to server:', err)
  }
}

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
  goToUpdates: () => void
  goToProfile: () => void
  goToLogin: () => void
  goToSignup: () => void
  setHighestUnlocked: (n: number) => void
  resetCampaign: () => void
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  screen: 'title',
  currentStage: 1,
  highestUnlocked: 1,

  goToCampaignSelect: () => set({ screen: 'campaign-select' }),

  selectStage: (id) => set({ currentStage: id, screen: 'campaign-intro' }),

  returnToTitle: () => set({ screen: 'title' }),

  unlockNextStage: () => {
    const { currentStage, highestUnlocked } = get()
    const newUnlocked = Math.max(highestUnlocked, currentStage + 1)
    set({ highestUnlocked: newUnlocked })
    // Optimistic — the server atomically clamps to max(existing, incoming),
    // so a stale write can never regress progress from another session.
    // Transient failures are retried a few times; a final failure is
    // logged rather than silently discarded.
    syncCampaignProgress(newUnlocked)
  },

  goToLogin: () => set({ screen: 'login' }),

  goToSignup: () => set({ screen: 'signup' }),

  setHighestUnlocked: (n) => set({ highestUnlocked: n }),

  resetCampaign: () => set({ screen: 'title', currentStage: 1, highestUnlocked: 1 }),

  goToLobby: () => set({ screen: 'lobby' }),

  goToHelp: () => set({ screen: 'help' }),

  goToUpdates: () => set({ screen: 'updates' }),

  goToProfile: () => set({ screen: 'profile' }),

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

import { create } from 'zustand'

// Gold, owned monsters, and active loadout — hydrated from the server's
// auth responses (signup/login/`/auth/me`) by authStore. See docs/SHOP_ECONOMY_SPEC.md.
export interface PlayerProfile {
  gold: number
  ownedMonsters: string[]
  loadout: string[]
}

// PvP-only — Campaign has no win/loss record (single-player against a fixed
// AI ramp, not a competitive result worth tracking; see server/prisma/schema.prisma).
export interface PlayerStats {
  pvpWins: number
  pvpLosses: number
}

interface ProfileStore extends PlayerProfile {
  stats: PlayerStats
  setProfile: (profile: PlayerProfile) => void
  setStats: (stats: PlayerStats) => void
  reset: () => void
}

const DEFAULT_PROFILE: PlayerProfile = { gold: 0, ownedMonsters: [], loadout: [] }
const DEFAULT_STATS: PlayerStats = { pvpWins: 0, pvpLosses: 0 }

export const useProfileStore = create<ProfileStore>((set) => ({
  ...DEFAULT_PROFILE,
  stats: DEFAULT_STATS,
  setProfile: (profile) => set(profile),
  setStats: (stats) => set({ stats }),
  reset: () => set({ ...DEFAULT_PROFILE, stats: DEFAULT_STATS }),
}))

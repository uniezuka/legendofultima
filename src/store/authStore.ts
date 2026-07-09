import { create } from 'zustand'
import * as authClient from '../network/authClient'
import type { AuthUser } from '../network/authClient'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  error: string | null

  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

// Proactively refresh the access token while a session is active, well
// inside its lifetime (server default JWT_ACCESS_TTL is 15 minutes). This
// keeps the Socket.io handshake token live even during a long PvP match
// where no REST call happens to trigger the normal 401-refresh path.
const PROACTIVE_REFRESH_MS = 10 * 60 * 1000
let refreshLoopHandle: ReturnType<typeof setInterval> | null = null

function startRefreshLoop() {
  stopRefreshLoop()
  refreshLoopHandle = setInterval(() => {
    authClient.refresh().catch(() => {
      useAuthStore.getState().logout()
    })
  }, PROACTIVE_REFRESH_MS)
}

function stopRefreshLoop() {
  if (refreshLoopHandle) {
    clearInterval(refreshLoopHandle)
    refreshLoopHandle = null
  }
}

// Concurrent callers (React StrictMode double-invoking the mount effect,
// or an accidental double-call) share one in-flight bootstrap instead of
// each racing their own /auth/refresh + /auth/me round trip.
let inFlightBootstrap: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,
  error: null,

  bootstrap: () => {
    if (inFlightBootstrap) return inFlightBootstrap
    inFlightBootstrap = (async () => {
      try {
        await authClient.refresh()
        const profile = await authClient.me()
        const { useCampaignStore } = await import('./campaignStore')
        useCampaignStore.getState().setHighestUnlocked(profile.campaignProgress.highestUnlocked)
        set({
          status: 'authenticated',
          user: { id: profile.id, email: profile.email, displayName: profile.displayName },
          error: null,
        })
        startRefreshLoop()
      } catch {
        set({ status: 'unauthenticated', user: null })
      } finally {
        inFlightBootstrap = null
      }
    })()
    return inFlightBootstrap
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const { user, campaignProgress } = await authClient.login(email, password)
      const { useCampaignStore } = await import('./campaignStore')
      useCampaignStore.getState().setHighestUnlocked(campaignProgress.highestUnlocked)
      set({ status: 'authenticated', user })
      startRefreshLoop()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  signup: async (email, password, displayName) => {
    set({ error: null })
    try {
      const { user, campaignProgress } = await authClient.signup(email, password, displayName)
      const { useCampaignStore } = await import('./campaignStore')
      useCampaignStore.getState().setHighestUnlocked(campaignProgress.highestUnlocked)
      set({ status: 'authenticated', user })
      startRefreshLoop()
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  logout: async () => {
    stopRefreshLoop()
    const { disconnectSocket } = await import('../network/socket')
    disconnectSocket()
    await authClient.logout()
    const { useCampaignStore } = await import('./campaignStore')
    useCampaignStore.getState().resetCampaign()
    set({ status: 'unauthenticated', user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))

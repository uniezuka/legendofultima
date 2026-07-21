const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export interface AuthUser {
  id: string
  email: string
  displayName: string
}

export interface ProfileResponse {
  gold: number
  ownedMonsters: string[]
  loadout: string[]
}

// PvP-only — Campaign has no win/loss record (single-player against a fixed
// AI ramp, not a competitive result worth tracking; see server/prisma/schema.prisma).
export interface StatsResponse {
  pvpWins: number
  pvpLosses: number
}

export interface MeResponse extends AuthUser {
  campaignProgress: { highestUnlocked: number }
  profile: ProfileResponse
  stats: StatsResponse
}

export interface AuthResponse {
  user: AuthUser
  campaignProgress: { highestUnlocked: number }
  profile: ProfileResponse
  stats: StatsResponse
}

let accessToken: string | null = null
let onTokenChange: ((token: string | null) => void) | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null) {
  accessToken = token
  onTokenChange?.(token)
}

// Lets socket.ts keep its handshake auth in sync without a circular import.
export function onAccessTokenChange(cb: (token: string | null) => void) {
  onTokenChange = cb
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  const isAuthEntryPoint = path === '/auth/refresh' || path === '/auth/login' || path === '/auth/signup'
  if (res.status === 401 && retry && !isAuthEntryPoint) {
    const refreshed = await refresh().catch(() => null)
    if (refreshed) return request<T>(path, options, false)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function signup(email: string, password: string, displayName: string): Promise<AuthResponse> {
  const data = await request<AuthResponse & { accessToken: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })
  setAccessToken(data.accessToken)
  return { user: data.user, campaignProgress: data.campaignProgress, profile: data.profile, stats: data.stats }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse & { accessToken: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAccessToken(data.accessToken)
  return { user: data.user, campaignProgress: data.campaignProgress, profile: data.profile, stats: data.stats }
}

// Deduped: concurrent callers (e.g. several parallel requests hitting 401
// at once, or React StrictMode double-invoking a mount effect) share one
// in-flight /auth/refresh call instead of each firing their own — the
// server can only safely rotate a given refresh cookie once at a time.
let inFlightRefresh: Promise<string> | null = null

export async function refresh(): Promise<string> {
  if (inFlightRefresh) return inFlightRefresh
  inFlightRefresh = (async () => {
    try {
      const data = await request<{ accessToken: string }>('/auth/refresh', { method: 'POST' }, false)
      setAccessToken(data.accessToken)
      return data.accessToken
    } finally {
      inFlightRefresh = null
    }
  })()
  return inFlightRefresh
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' }).catch(() => {})
  setAccessToken(null)
}

export async function me(): Promise<MeResponse> {
  return request<MeResponse>('/auth/me')
}

export interface CampaignProgressResponse {
  highestUnlocked: number
  // Only present when this call's write genuinely advanced highestUnlocked —
  // the server-verified "first clear" signal that gates the campaign-win Gold
  // reward. See server/campaign.ts.
  gold?: number
}

export async function putCampaignProgress(highestUnlocked: number): Promise<CampaignProgressResponse> {
  return request('/campaign-progress', {
    method: 'PUT',
    body: JSON.stringify({ highestUnlocked }),
  })
}

export async function purchaseMonster(monsterType: string): Promise<{ gold: number; ownedMonsters: string[] }> {
  return request('/shop/purchase', {
    method: 'POST',
    body: JSON.stringify({ monsterType }),
  })
}

export async function putLoadout(monsterTypes: string[]): Promise<{ loadout: string[] }> {
  return request('/loadout', {
    method: 'PUT',
    body: JSON.stringify({ monsterTypes }),
  })
}

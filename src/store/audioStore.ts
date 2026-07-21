import { create } from 'zustand'

interface AudioState {
  muted: boolean
  bgmVolume: number
  sfxVolume: number
}

interface AudioStore extends AudioState {
  setMuted: (muted: boolean) => void
  toggleMuted: () => void
  setBgmVolume: (volume: number) => void
  setSfxVolume: (volume: number) => void
}

function readNumber(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  const parsed = raw === null ? NaN : Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const INITIAL: AudioState = {
  muted: localStorage.getItem('lou_muted') === 'true',
  bgmVolume: readNumber('lou_bgm_volume', 0.5),
  sfxVolume: readNumber('lou_sfx_volume', 0.7),
}

export const useAudioStore = create<AudioStore>((set) => ({
  ...INITIAL,

  setMuted: (muted) => {
    localStorage.setItem('lou_muted', String(muted))
    set({ muted })
  },
  toggleMuted: () => set((s) => {
    localStorage.setItem('lou_muted', String(!s.muted))
    return { muted: !s.muted }
  }),
  setBgmVolume: (bgmVolume) => {
    localStorage.setItem('lou_bgm_volume', String(bgmVolume))
    set({ bgmVolume })
  },
  setSfxVolume: (sfxVolume) => {
    localStorage.setItem('lou_sfx_volume', String(sfxVolume))
    set({ sfxVolume })
  },
}))

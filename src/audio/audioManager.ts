import { useAudioStore } from '../store/audioStore'
import { BGM_FILES, BGM_ONESHOT, SFX_FILES, type BgmKey, type SfxKey } from '../constants/audio'

// Base <audio> elements, one per key — cloned on play so overlapping SFX
// (e.g. two quick attacks) don't cut each other off.
const sfxPool: Partial<Record<SfxKey, HTMLAudioElement>> = {}

let bgmElement: HTMLAudioElement | null = null
let bgmKey: BgmKey | null = null
let retryListenerAttached = false

function getSfxBase(key: SfxKey): HTMLAudioElement {
  let el = sfxPool[key]
  if (!el) {
    el = new Audio(SFX_FILES[key])
    sfxPool[key] = el
  }
  return el
}

function retryOnNextGesture(retry: () => void) {
  if (retryListenerAttached) return
  retryListenerAttached = true
  const handler = () => {
    retryListenerAttached = false
    retry()
  }
  document.addEventListener('pointerdown', handler, { once: true })
  document.addEventListener('keydown', handler, { once: true })
}

export function playSfx(key: SfxKey) {
  const { muted, sfxVolume } = useAudioStore.getState()
  if (muted || sfxVolume <= 0) return

  const base = getSfxBase(key)
  const instance = base.cloneNode(true) as HTMLAudioElement
  instance.volume = sfxVolume
  instance.play().catch(() => {})
}

export function playBgm(key: BgmKey) {
  if (bgmKey === key) return
  bgmKey = key

  if (bgmElement) {
    bgmElement.pause()
    bgmElement = null
  }

  const { muted, bgmVolume } = useAudioStore.getState()
  const el = new Audio(BGM_FILES[key])
  el.loop = !BGM_ONESHOT[key]
  el.volume = muted ? 0 : bgmVolume
  bgmElement = el

  el.play().catch(() => {
    retryOnNextGesture(() => {
      if (bgmElement === el) el.play().catch(() => {})
    })
  })
}

export function stopBgm() {
  bgmKey = null
  if (bgmElement) {
    bgmElement.pause()
    bgmElement = null
  }
}

// Live-apply volume/mute changes to whatever's currently playing.
useAudioStore.subscribe(({ muted, bgmVolume }) => {
  if (bgmElement) {
    bgmElement.volume = muted ? 0 : bgmVolume
  }
})

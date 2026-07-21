import { useAudioStore } from '../../store/audioStore'

// Persistent mute/volume control, mounted once at the App root so it's
// visible on every screen including mid-match. Mute is a single master
// toggle; BGM and SFX get independent volume sliders — see CLAUDE.md Audio section.
export default function AudioControls() {
  const muted = useAudioStore(s => s.muted)
  const bgmVolume = useAudioStore(s => s.bgmVolume)
  const sfxVolume = useAudioStore(s => s.sfxVolume)
  const toggleMuted = useAudioStore(s => s.toggleMuted)
  const setBgmVolume = useAudioStore(s => s.setBgmVolume)
  const setSfxVolume = useAudioStore(s => s.setSfxVolume)

  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-3 bg-black/60 border border-gray-700 rounded-lg px-2.5 py-1.5">
      <button
        onClick={toggleMuted}
        className="text-gray-300 hover:text-white text-lg leading-none"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <label className="flex items-center gap-1">
        <span className="text-gray-400 text-[10px] font-semibold">BGM</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={bgmVolume}
          disabled={muted}
          onChange={e => setBgmVolume(Number(e.target.value))}
          className="w-14 accent-yellow-500 disabled:opacity-40"
          title="Music volume"
        />
      </label>
      <label className="flex items-center gap-1">
        <span className="text-gray-400 text-[10px] font-semibold">SFX</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={sfxVolume}
          disabled={muted}
          onChange={e => setSfxVolume(Number(e.target.value))}
          className="w-14 accent-yellow-500 disabled:opacity-40"
          title="Sound effects volume"
        />
      </label>
    </div>
  )
}

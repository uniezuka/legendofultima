export type BgmKey = 'title' | 'campaign' | 'pvp' | 'victory' | 'defeat'

export type SfxKey =
  | 'dice-roll'
  | 'path-place'
  | 'path-skip'
  | 'summon'
  | 'move'
  | 'shield-up'
  | 'shield-break'
  | 'attack-hit'
  | 'base-hit'
  | 'death'
  | 'mana-gain'
  | 'ui-click'

export const BGM_FILES: Record<BgmKey, string> = {
  title: '/assets/bgm/title.mp3',
  campaign: '/assets/bgm/campaign.mp3',
  pvp: '/assets/bgm/pvp.mp3',
  victory: '/assets/bgm/victory.mp3',
  defeat: '/assets/bgm/defeat.mp3',
}

// BGM tracks that play once instead of looping.
export const BGM_ONESHOT: Partial<Record<BgmKey, true>> = {
  victory: true,
  defeat: true,
}

export const SFX_FILES: Record<SfxKey, string> = {
  'dice-roll': '/assets/sfx/dice-roll.mp3',
  'path-place': '/assets/sfx/path-place.mp3',
  'path-skip': '/assets/sfx/path-skip.mp3',
  summon: '/assets/sfx/summon.mp3',
  move: '/assets/sfx/move.mp3',
  'shield-up': '/assets/sfx/shield-up.mp3',
  'shield-break': '/assets/sfx/shield-break.mp3',
  'attack-hit': '/assets/sfx/attack-hit.mp3',
  'base-hit': '/assets/sfx/base-hit.mp3',
  death: '/assets/sfx/death.mp3',
  'mana-gain': '/assets/sfx/mana-gain.mp3',
  'ui-click': '/assets/sfx/ui-click.mp3',
}

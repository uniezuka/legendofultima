import { useGameStore } from './store/gameStore'
import { useCampaignStore } from './store/campaignStore'
import TitleScreen from './components/screens/TitleScreen'
import GameScreen from './components/screens/GameScreen'
import CampaignScreen from './components/screens/CampaignScreen'
import StageIntroScreen from './components/screens/StageIntroScreen'

export default function App() {
  const gameStarted = useGameStore(s => s.gameStarted)
  const screen = useCampaignStore(s => s.screen)

  if (gameStarted) return <GameScreen />
  if (screen === 'campaign-select') return <CampaignScreen />
  if (screen === 'campaign-intro') return <StageIntroScreen />
  return <TitleScreen />
}

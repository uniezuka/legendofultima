import { useGameStore } from './store/gameStore'
import { useCampaignStore } from './store/campaignStore'
import TitleScreen from './components/screens/TitleScreen'
import GameScreen from './components/screens/GameScreen'
import CampaignScreen from './components/screens/CampaignScreen'
import StageIntroScreen from './components/screens/StageIntroScreen'
import LobbyScreen from './components/screens/LobbyScreen'
import HelpScreen from './components/screens/HelpScreen'

export default function App() {
  const gameStarted = useGameStore(s => s.gameStarted)
  const screen = useCampaignStore(s => s.screen)

  if (gameStarted) return <GameScreen />
  if (screen === 'lobby') return <LobbyScreen />
  if (screen === 'campaign-select') return <CampaignScreen />
  if (screen === 'campaign-intro') return <StageIntroScreen />
  if (screen === 'help') return <HelpScreen />
  return <TitleScreen />
}

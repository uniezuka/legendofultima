import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { useCampaignStore } from './store/campaignStore'
import { useAuthStore } from './store/authStore'
import TitleScreen from './components/screens/TitleScreen'
import GameScreen from './components/screens/GameScreen'
import CampaignScreen from './components/screens/CampaignScreen'
import StageIntroScreen from './components/screens/StageIntroScreen'
import LobbyScreen from './components/screens/LobbyScreen'
import HelpScreen from './components/screens/HelpScreen'
import UpdatesScreen from './components/screens/UpdatesScreen'
import LoginScreen from './components/screens/LoginScreen'
import SignupScreen from './components/screens/SignupScreen'
import SplashScreen from './components/screens/SplashScreen'

export default function App() {
  const gameStarted = useGameStore(s => s.gameStarted)
  const screen = useCampaignStore(s => s.screen)
  const authStatus = useAuthStore(s => s.status)

  useEffect(() => {
    useAuthStore.getState().bootstrap()
  }, [])

  if (authStatus === 'checking') return <SplashScreen />
  if (authStatus === 'unauthenticated') {
    return screen === 'signup' ? <SignupScreen /> : <LoginScreen />
  }

  if (gameStarted) return <GameScreen />
  if (screen === 'lobby') return <LobbyScreen />
  if (screen === 'campaign-select') return <CampaignScreen />
  if (screen === 'campaign-intro') return <StageIntroScreen />
  if (screen === 'help') return <HelpScreen />
  if (screen === 'updates') return <UpdatesScreen />
  return <TitleScreen />
}

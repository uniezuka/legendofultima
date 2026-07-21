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
import ProfileScreen from './components/screens/ProfileScreen'
import LoginScreen from './components/screens/LoginScreen'
import SignupScreen from './components/screens/SignupScreen'
import SplashScreen from './components/screens/SplashScreen'
import BgmController from './audio/BgmController'
import AudioControls from './components/ui/AudioControls'

function Screens() {
  const gameStarted = useGameStore(s => s.gameStarted)
  const screen = useCampaignStore(s => s.screen)
  const authStatus = useAuthStore(s => s.status)

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
  if (screen === 'profile') return <ProfileScreen />
  return <TitleScreen />
}

export default function App() {
  useEffect(() => {
    useAuthStore.getState().bootstrap()
  }, [])

  return (
    <>
      <BgmController />
      <AudioControls />
      <Screens />
    </>
  )
}

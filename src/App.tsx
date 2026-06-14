import { useGameStore } from './store/gameStore'
import TitleScreen from './components/screens/TitleScreen'
import GameScreen from './components/screens/GameScreen'

export default function App() {
  const gameStarted = useGameStore(s => s.gameStarted)
  return gameStarted ? <GameScreen /> : <TitleScreen />
}

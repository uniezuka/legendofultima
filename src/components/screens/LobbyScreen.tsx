import { useState, useEffect } from 'react'
import { useCampaignStore } from '../../store/campaignStore'
import { useOnlineStore } from '../../store/onlineStore'
import { connectSocket, getSocket } from '../../network/socket'

export default function LobbyScreen() {
  const returnToTitle = useCampaignStore(s => s.returnToTitle)
  const {
    myNickname, setMyNickname, lobbyStatus, setLobbyStatus,
    roomCode, roomError, setRoomError, myPlayerId, setOnline,
    connectionStatus,
  } = useOnlineStore()

  const [joinCode, setJoinCode] = useState('')
  const [localNickname, setLocalNickname] = useState(myNickname || '')

  // Connect socket when lobby mounts
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected) {
      useOnlineStore.getState().setConnectionStatus('connecting')
      connectSocket()
    }

    return () => {
      // Don't disconnect here — the socket persists while the game is active
    }
  }, [])

  function getSessionToken(): string {
    let token = localStorage.getItem('lou_session')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('lou_session', token)
    }
    return token
  }

  function handleCreate() {
    if (!localNickname.trim()) return
    setMyNickname(localNickname.trim())
    setOnline(true)
    setLobbyStatus('creating')
    getSocket().emit('create_room', {
      nickname: localNickname.trim(),
      sessionToken: getSessionToken(),
    })
  }

  function handleJoin() {
    if (!localNickname.trim() || !joinCode.trim()) return
    setMyNickname(localNickname.trim())
    setOnline(true)
    setLobbyStatus('joining')
    setRoomError(null)
    getSocket().emit('join_room', {
      roomCode: joinCode.trim().toUpperCase(),
      nickname: localNickname.trim(),
      sessionToken: getSessionToken(),
    })
  }

  function handleBack() {
    useOnlineStore.getState().reset()
    returnToTitle()
  }

  const isWaiting = lobbyStatus === 'waiting'
  const isConnecting = connectionStatus === 'connecting'

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-4 px-6">
        <div className="text-center">
          <h1 className="text-yellow-400 text-3xl font-black drop-shadow">Online PvP</h1>
          <p className="text-gray-400 text-sm mt-1">Play against a friend over the internet.</p>
        </div>

        {/* Nickname */}
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Your Name</label>
          <input
            type="text"
            value={localNickname}
            onChange={e => { setLocalNickname(e.target.value); setRoomError(null) }}
            maxLength={20}
            placeholder="Enter nickname…"
            className="bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
            disabled={isWaiting}
          />
        </div>

        {/* Error */}
        {roomError && (
          <p className="text-red-400 text-sm text-center">{roomError}</p>
        )}

        {/* Waiting state */}
        {isWaiting && roomCode && (
          <div className="bg-gray-900/80 border border-yellow-600 rounded-lg p-5 flex flex-col items-center gap-3">
            <p className="text-gray-300 text-sm">Share this code with your opponent:</p>
            <div className="text-yellow-400 text-4xl font-black tracking-[0.25em] select-all">{roomCode}</div>
            {myPlayerId === 'player1' && (
              <p className="text-gray-500 text-xs text-center">Waiting for opponent to join…</p>
            )}
          </div>
        )}

        {/* Create / Join (shown when not yet waiting) */}
        {!isWaiting && (
          <>
            <button
              onClick={handleCreate}
              disabled={!localNickname.trim() || isConnecting}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black rounded-lg text-base"
            >
              {isConnecting ? 'Connecting…' : 'Create Room'}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-700" />
              <span className="text-gray-600 text-xs">OR</span>
              <div className="flex-1 border-t border-gray-700" />
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setRoomError(null) }}
                maxLength={6}
                placeholder="Enter room code…"
                className="bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 text-sm text-center font-mono tracking-widest focus:outline-none focus:border-yellow-500 uppercase"
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
              />
              <button
                onClick={handleJoin}
                disabled={!localNickname.trim() || joinCode.length < 6 || isConnecting}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold rounded-lg text-base"
              >
                Join Room
              </button>
            </div>
          </>
        )}

        <button
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-300 text-sm text-center mt-2"
        >
          ← Back to Menu
        </button>
      </div>
    </div>
  )
}

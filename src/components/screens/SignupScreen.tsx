import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useCampaignStore } from '../../store/campaignStore'

export default function SignupScreen() {
  const signup = useAuthStore(s => s.signup)
  const error = useAuthStore(s => s.error)
  const clearError = useAuthStore(s => s.clearError)
  const goToLogin = useCampaignStore(s => s.goToLogin)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mismatch, setMismatch] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !displayName.trim() || !password) return
    if (password !== confirmPassword) { setMismatch(true); return }
    setMismatch(false)
    setSubmitting(true)
    try {
      await signup(email.trim(), password, displayName.trim())
    } catch {
      // error is surfaced via authStore.error
    } finally {
      setSubmitting(false)
    }
  }

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

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-sm flex flex-col gap-4 px-6">
        <div className="text-center">
          <h1 className="text-yellow-400 text-3xl font-black drop-shadow">Legend of Ultima</h1>
          <p className="text-gray-400 text-sm mt-1">Create an account to play.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); clearError() }}
            maxLength={20}
            placeholder="Enter a display name…"
            className="bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
            autoComplete="nickname"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); clearError() }}
            placeholder="you@example.com"
            className="bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); clearError(); setMismatch(false) }}
              placeholder="At least 8 characters"
              className="w-full bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-yellow-500"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setMismatch(false) }}
              placeholder="Re-enter password"
              className="w-full bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 pr-10 text-sm focus:outline-none focus:border-yellow-500"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(v => !v)}
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-sm"
            >
              {showConfirmPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {mismatch && <p className="text-red-400 text-sm text-center">Passwords don't match.</p>}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={!email.trim() || !displayName.trim() || password.length < 8 || submitting}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-black rounded-lg text-base"
        >
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>

        <button
          type="button"
          onClick={goToLogin}
          className="text-gray-500 hover:text-gray-300 text-sm text-center"
        >
          Already have an account? Log in
        </button>
      </form>
    </div>
  )
}

export default function SplashScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: 'url(/assets/ui/title-bg.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <p className="relative z-10 text-gray-300 text-sm animate-pulse">Loading…</p>
    </div>
  )
}

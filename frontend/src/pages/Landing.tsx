import { useNavigate } from 'react-router-dom'

const videoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Skill Explorer', to: '/skills' },
  { label: 'Career Advisor', to: '/advisor' },
  { label: 'Reports', to: '/reports' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-8">
        <button
          onClick={() => navigate('/')}
          className="text-3xl font-normal tracking-tight text-foreground"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          SkillLens<sup className="text-xs">®</sup>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link, index) => (
            <button
              key={link.label}
              onClick={() => navigate(link.to)}
              className={`text-sm transition-colors hover:text-foreground ${
                index === 0 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </nav>

      <section className="relative z-10 flex min-h-[calc(100vh-96px)] flex-col items-center justify-center px-6 py-[90px] pb-40 pt-32 text-center">
        <h1
          className="animate-fade-rise max-w-7xl text-5xl font-normal leading-[0.95] tracking-[-2.46px] text-foreground sm:text-7xl md:text-8xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Where skills rise <em className="not-italic text-muted-foreground">through uncertainty.</em>
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          SkillLens helps deep thinkers, bold builders, and quiet career strategists see which skills are gaining strength,
          which are fading, and where focused learning can turn into real advantage.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="liquid-glass animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-foreground transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </section>
    </main>
  )
}

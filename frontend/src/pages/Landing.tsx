import { useState } from 'react'
import { BarChart3, BrainCircuit, Compass } from 'lucide-react'
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
  const [videoUnavailable, setVideoUnavailable] = useState(false)
  const navigateFromLanding = (to: string) => {
    const documentWithTransition = document as Document & {
      startViewTransition?: (update: () => void) => void
    }
    if (documentWithTransition.startViewTransition) {
      documentWithTransition.startViewTransition(() => navigate(to))
      return
    }
    navigate(to)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b0618] text-foreground">
      <div aria-hidden="true" className="bg-grid absolute inset-0 z-0 opacity-35" />
      <video
        autoPlay
        loop
        muted
        playsInline
        onError={() => setVideoUnavailable(true)}
        className={`absolute inset-0 z-0 h-full w-full object-cover transition-opacity duration-700 ${videoUnavailable ? 'opacity-0' : 'opacity-100'}`}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <noscript>
        <img src="/landing-poster.svg" alt="SkillLens AI workforce intelligence" className="absolute inset-0 h-full w-full object-cover" />
      </noscript>

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-8">
        <button
          onClick={() => navigateFromLanding('/')}
          className="landing-logo text-3xl tracking-tight text-foreground"
        >
          SkillLens<sup className="text-xs">®</sup>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link, index) => (
            <button
              key={link.label}
              onClick={() => navigateFromLanding(link.to)}
              className={`text-sm transition-colors hover:text-foreground ${
                index === 0 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigateFromLanding('/dashboard')}
          className="landing-glass-button liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>
      </nav>

      <section className="relative z-10 flex min-h-[calc(100vh-96px)] flex-col items-center justify-center px-6 py-16 pt-24 text-center">
        <h1
          className="landing-display animate-fade-rise max-w-7xl text-5xl leading-[0.95] tracking-[-2.46px] text-foreground sm:text-7xl md:text-8xl"
        >
          Where skills rise <em className="heading-shine not-italic">through uncertainty.</em>
        </h1>

        <p className="animate-fade-rise-delay mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          SkillLens helps deep thinkers, bold builders, and quiet career strategists see which skills are gaining strength,
          which are fading, and where focused learning can turn into real advantage.
        </p>
        <p className="animate-fade-rise-delay mt-3 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
          AI-powered workforce intelligence platform
        </p>

        <button
          onClick={() => navigateFromLanding('/dashboard')}
          className="landing-glass-button liquid-glass animate-fade-rise-delay-2 mt-12 cursor-pointer rounded-full px-14 py-5 text-base text-foreground transition-transform hover:scale-[1.03]"
        >
          Begin Journey
        </button>

        <div className="animate-fade-rise-delay-2 mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { icon: Compass, title: 'Skill Explorer', detail: 'Compare workforce signals', to: '/skills' },
            { icon: BrainCircuit, title: 'Career Advisor', detail: 'Grounded next-step guidance', to: '/advisor' },
            { icon: BarChart3, title: '3-Year Forecasts', detail: 'Confidence-aware outlooks', to: '/forecasts' },
          ].map(({ icon: Icon, title, detail, to }) => (
            <button key={title} onClick={() => navigateFromLanding(to)} className="landing-glass-button liquid-glass flex items-center gap-3 rounded-xl bg-[#1a0d31]/60 px-4 py-3 text-left backdrop-blur-md transition-transform hover:scale-[1.02]">
              <Icon size={18} className="shrink-0 text-fuchsia-200" />
              <span><b className="block text-sm text-white">{title}</b><small className="text-xs text-white/60">{detail}</small></span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs font-medium tracking-wide text-white/55">111 canonical skills <span className="mx-2 text-fuchsia-200/70">·</span> 8 workforce industries <span className="mx-2 text-fuchsia-200/70">·</span> 3-year confidence-aware forecasts</p>
      </section>
    </main>
  )
}

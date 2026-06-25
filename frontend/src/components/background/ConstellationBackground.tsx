import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  baseRadius: number
  alpha: number
  color: string
}

const colors = ['#c084fc', '#a855f7', '#d8b4fe', '#e879f9', '#c4b5fd', '#f5d0fe']

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function makeParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = random(0.08, 0.28)
    const baseRadius = random(0.8, 2.2)

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: baseRadius,
      baseRadius,
      alpha: random(0.28, 0.82),
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  })
}

export default function ConstellationBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -9999, y: -9999, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let animation = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particlesRef.current = makeParticles(width, height, width < 768 ? 90 : 180)
    }

    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY, active: true }
    }

    const onMouseLeave = () => {
      mouseRef.current.active = false
    }

    const draw = () => {
      const particles = particlesRef.current
      const mouse = mouseRef.current
      ctx.clearRect(0, 0, width, height)

      const bg = ctx.createRadialGradient(width * 0.5, height * 0.35, 0, width * 0.5, height * 0.5, Math.max(width, height))
      bg.addColorStop(0, 'rgba(39, 11, 67, 0.9)')
      bg.addColorStop(0.55, 'rgba(20, 7, 38, 0.96)')
      bg.addColorStop(1, 'rgba(8, 4, 17, 1)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      ctx.globalCompositeOperation = 'screen'

      for (const particle of particles) {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -20) particle.x = width + 20
        if (particle.x > width + 20) particle.x = -20
        if (particle.y < -20) particle.y = height + 20
        if (particle.y > height + 20) particle.y = -20

        let mouseFactor = 0
        if (mouse.active) {
          const dx = particle.x - mouse.x
          const dy = particle.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < 280) mouseFactor = (1 - dist / 280) ** 2
        }
        particle.radius = particle.baseRadius + mouseFactor * 1.8
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        let connections = 0

        for (let j = i + 1; j < particles.length && connections < 4; j++) {
          const b = particles[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist > 145) continue

          let alpha = (1 - dist / 145) * 0.16
          if (mouse.active) {
            const midX = (a.x + b.x) / 2
            const midY = (a.y + b.y) / 2
            const mouseDist = Math.hypot(midX - mouse.x, midY - mouse.y)
            if (mouseDist < 240) alpha += (1 - mouseDist / 240) * 0.3
          }

          ctx.globalAlpha = Math.min(0.42, alpha)
          ctx.strokeStyle = a.color
          ctx.lineWidth = 0.45 + (1 - dist / 145) * 0.7
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
          connections++
        }
      }

      if (mouse.active) {
        for (const particle of particles) {
          const dist = Math.hypot(particle.x - mouse.x, particle.y - mouse.y)
          if (dist > 230) continue

          const strength = (1 - dist / 230) ** 2
          const gradient = ctx.createLinearGradient(mouse.x, mouse.y, particle.x, particle.y)
          gradient.addColorStop(0, `rgba(167, 139, 250, ${strength * 0.9})`)
          gradient.addColorStop(1, `rgba(233, 213, 255, ${strength * 0.45})`)

          ctx.globalAlpha = 1
          ctx.strokeStyle = gradient
          ctx.lineWidth = 1 + strength * 1.4
          ctx.beginPath()
          ctx.moveTo(mouse.x, mouse.y)
          ctx.lineTo(particle.x, particle.y)
          ctx.stroke()
        }
      }

      for (const particle of particles) {
        let mouseFactor = 0
        if (mouse.active) {
          const dist = Math.hypot(particle.x - mouse.x, particle.y - mouse.y)
          if (dist < 280) mouseFactor = (1 - dist / 280) ** 2
        }

        const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius * 6)
        glow.addColorStop(0, `rgba(167, 139, 250, ${0.1 + mouseFactor * 0.28})`)
        glow.addColorStop(1, 'transparent')
        ctx.globalAlpha = 1
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius * 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = Math.min(0.68, particle.alpha * 0.72 + mouseFactor * 0.4)
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      animation = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseleave', onMouseLeave)
    animation = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animation)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#080411]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-80 mix-blend-screen" aria-hidden="true" />
      <div className="absolute inset-0 bg-[#080411]/20" />
      <div className="absolute inset-y-0 left-1/4 hidden w-px bg-white/[0.04] md:block" />
      <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/[0.04] md:block" />
      <div className="absolute inset-y-0 left-3/4 hidden w-px bg-white/[0.04] md:block" />
    </div>
  )
}

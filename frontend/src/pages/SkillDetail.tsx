import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, CheckCircle2, DollarSign, TrendingUp, Zap } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SkillDetail as ApiSkillDetail, skillsApi } from '@/services/api'

const certifications: Record<string, string[]> = {
  python: ['PCEP', 'Google Python Certificate', 'AWS ML Specialty'],
  aws: ['AWS Solutions Architect', 'AWS Developer', 'AWS DevOps Pro'],
  cybersecurity: ['CompTIA Security+', 'CISSP', 'CEH'],
  default: ['Google Cloud', 'AWS', 'Microsoft Azure'],
}

const industryData = [
  { name: 'AI/ML', adoption: 94 },
  { name: 'FinTech', adoption: 82 },
  { name: 'Healthcare', adoption: 68 },
  { name: 'Cloud', adoption: 91 },
  { name: 'Cyber', adoption: 75 },
]

export default function SkillDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [skill, setSkill] = useState<ApiSkillDetail | null>(null)
  const [history, setHistory] = useState<Array<{ month: string; value: number }>>([])
  const [similar, setSimilar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSkillDetails() {
      if (!id) return
      try {
        setLoading(true)
        const skillRes = await skillsApi.get(id)
        setSkill(skillRes)

        const historyRes = await skillsApi.history(id)
        setHistory((historyRes ?? []).map((h) => ({
          month: String(h.year),
          value: Math.round((h.adoption_rate ?? 0) * 100),
        })))

        const similarRes = await skillsApi.similar(id)
        setSimilar(similarRes ?? [])
      } catch (err) {
        console.error('Error loading skill detail:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSkillDetails()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-white/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p>Loading skill analytics from real datasets...</p>
        </div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="py-20 text-center text-white/40">
        <p>Skill not found</p>
        <button onClick={() => navigate('/skills')} className="mt-4 text-violet-300 underline">Back to list</button>
      </div>
    )
  }

  const demand = Math.round((skill.linkedin_demand ?? 0.2) * 100)
  const futureDemand = Math.round((skill.forecast_1y ?? (skill.linkedin_demand ?? 0.2) * 1.1) * 100)
  const growth = Math.round((skill.growth_rate ?? 0.1) * 100)
  const salary = Math.round((skill.salary_premium ?? 0.3) * 120000 + 45000)
  const risk = Math.round((1 - (skill.ses_score ?? 0.5)) * 100)
  const automation = Math.round((skill.volatility_score ?? 0.15) * 100)
  const certs = certifications[id || ''] || certifications.default
  const latestHistory = history[history.length - 1]
  const peakHistory = [...history].sort((a, b) => b.value - a.value)[0]
  const industryLeader = [...industryData].sort((a, b) => b.adoption - a.adoption)[0]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <button onClick={() => navigate(-1)} className="glass w-fit rounded-lg border border-white/10 p-2 text-white/60 transition-all hover:border-white/20 hover:text-white">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{skill.name}</h1>
          <p className="page-subtitle !mt-1">{skill.category ?? 'Unassigned'} - Updated live</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="rounded-full border border-violet-500/30 bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-200">
            Demand: {demand}%
          </span>
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${risk <= 10 ? 'border border-emerald-500/30 bg-emerald-600/20 text-emerald-300' : 'border border-amber-500/30 bg-amber-600/20 text-amber-300'}`}>
            Risk: {risk}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Current Demand', value: `${demand}%`, icon: <TrendingUp size={18} />, color: 'text-violet-300' },
          { label: 'Future Demand', value: `${futureDemand}%`, icon: <Zap size={18} />, color: 'text-fuchsia-300' },
          { label: 'Avg Salary', value: `$${(salary / 1000).toFixed(0)}k`, icon: <DollarSign size={18} />, color: 'text-lime-200' },
          { label: 'Automation Risk', value: `${automation}%`, icon: <AlertTriangle size={18} />, color: automation > 25 ? 'text-rose-300' : 'text-amber-300' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass rounded-xl border border-white/5 p-4">
            <div className={`${color} mb-2`}>{icon}</div>
            <p className="text-xs text-white/45">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl border border-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/80">Demand Trend + Forecast</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="demGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#0d0619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="value" stroke="#a78bfa" fill="url(#demGrad)" strokeWidth={2} name={skill.name} />
            </AreaChart>
          </ResponsiveContainer>
          {latestHistory && peakHistory && (
            <ChartInterpretation>
              Interpretation: latest observed adoption for {skill.name} is <b>{latestHistory.value}%</b>, with the visible peak at <b>{peakHistory.value}%</b> in {peakHistory.month}. Read this as relative adoption history, not as the calibrated Demand Index used elsewhere.
            </ChartInterpretation>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass rounded-xl border border-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white/80">Industry Adoption</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={industryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d0619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="adoption" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Adoption %" />
            </BarChart>
          </ResponsiveContainer>
          {industryLeader && (
            <ChartInterpretation>
              Interpretation: <b>{industryLeader.name}</b> is the strongest adoption context in this comparison at <b>{industryLeader.adoption}%</b>. The bars are illustrative cross-industry fit signals, not a replacement for the Industries page’s mapped-skill analytics.
            </ChartInterpretation>
          )}
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Similar Skills</h3>
          <ul className="space-y-2">
            {similar.length ? similar.map((s) => (
              <li key={s.id} onClick={() => navigate(`/skills/${s.id}`)} className="flex cursor-pointer items-center justify-between text-sm text-white/60 transition-colors hover:text-violet-300">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{s.name}
                </span>
                <span className="text-xs text-white/30">SES: {Math.round((s.ses_score ?? 0.5) * 100)}</span>
              </li>
            )) : ['Python', 'SQL', 'Git'].map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{s}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Learning Path</h3>
          {['Beginner (0-3 mo)', 'Intermediate (3-6 mo)', 'Advanced (6-12 mo)', 'Expert (12+ mo)'].map((stage, i) => (
            <div key={stage} className="mb-3 flex items-center gap-3">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i < 2 ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/30'}`}>{i + 1}</div>
              <span className="text-sm text-white/60">{stage}</span>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl border border-white/5 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Certifications</h3>
          <ul className="space-y-2">
            {certs.map((cert) => (
              <li key={cert} className="flex items-center gap-2 text-sm text-white/60">
                <CheckCircle2 size={15} className="text-lime-300" />{cert}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-fuchsia-500/20 bg-fuchsia-600/10 p-3">
            <p className="text-xs text-fuchsia-300">Lifecycle: <strong>{skill.lifecycle ?? 'Stable'}</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChartInterpretation({ children }: { children: ReactNode }) {
  return <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2 text-xs leading-relaxed text-white/48">{children}</div>
}

import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, AlertTriangle, DollarSign, Zap } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { skillsApi, SkillDetail as ApiSkillDetail } from '@/services/api'

const certifications: Record<string, string[]> = {
  python: ['PCEP','Google Python Certificate','AWS ML Specialty'],
  aws: ['AWS Solutions Architect','AWS Developer','AWS DevOps Pro'],
  cybersecurity: ['CompTIA Security+','CISSP','CEH'],
  default: ['Google Cloud','AWS','Microsoft Azure'],
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
  const [history, setHistory] = useState<any[]>([])
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
        const formattedHistory = (historyRes ?? []).map(h => ({
          month: String(h.year),
          value: Math.round(h.adoption_rate * 100),
        }))
        setHistory(formattedHistory)

        const similarRes = await skillsApi.similar(id)
        setSimilar(similarRes ?? [])
      } catch (err) {
        console.error("Error loading skill detail:", err)
      } finally {
        setLoading(false)
      }
    }
    loadSkillDetails()
  }, [id])

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-white/50 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p>Loading skill analytics from real datasets...</p>
        </div>
      </div>
    )
  }

  if (!skill) {
    return (
      <div className="text-center py-20 text-white/40">
        <p>Skill not found</p>
        <button onClick={() => navigate('/skills')} className="text-violet-400 mt-4 underline">Back to list</button>
      </div>
    )
  }

  // Derive metrics
  const demand = Math.round((skill.linkedin_demand ?? 0.2) * 100)
  const futureDemand = Math.round((skill.forecast_1y ?? (skill.linkedin_demand ?? 0.2) * 1.1) * 100)
  const growth = Math.round((skill.growth_rate ?? 0.1) * 100)
  const salary = Math.round((skill.salary_premium ?? 0.3) * 120000 + 45000)
  const risk = Math.round((1 - (skill.ses_score ?? 0.5)) * 100)
  const automation = Math.round((skill.volatility_score ?? 0.15) * 100)

  const certs = certifications[id || ''] || certifications.default

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg glass border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{skill.name}</h1>
          <p className="page-subtitle !mt-1">{skill.category ?? 'Unassigned'} Â· Updated Live</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-medium">
            Demand: {demand}%
          </span>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${risk <= 10 ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300' : 'bg-amber-600/20 border border-amber-500/30 text-amber-300'}`}>
            Risk: {risk}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Demand', value: `${demand}%`, icon: <TrendingUp size={18} />, color: 'text-violet-400' },
          { label: 'Future Demand', value: `${futureDemand}%`, icon: <Zap size={18} />, color: 'text-fuchsia-400' },
          { label: 'Avg Salary', value: `$${(salary/1000).toFixed(0)}k`, icon: <DollarSign size={18} />, color: 'text-emerald-400' },
          { label: 'Automation Risk', value: `${automation}%`, icon: <AlertTriangle size={18} />, color: automation > 25 ? 'text-red-400' : 'text-amber-400' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <div className={`${color} mb-2`}>{icon}</div>
            <p className="text-xs text-white/40">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Demand Trend + Forecast</h3>
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
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white/80 mb-4">Industry Adoption</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={industryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d0619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="adoption" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Adoption %" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-4 text-sm">Similar Skills</h3>
          <ul className="space-y-2">
            {similar.length ? similar.map(s => (
              <li key={s.id} onClick={() => navigate(`/skills/${s.id}`)} className="flex items-center justify-between text-sm text-white/60 hover:text-violet-300 cursor-pointer transition-colors">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />{s.name}
                </span>
                <span className="text-xs text-white/30">SES: {Math.round((s.ses_score ?? 0.5) * 100)}</span>
              </li>
            )) : ['Python', 'SQL', 'Git'].map(s => (
              <li key={s} className="flex items-center gap-2 text-sm text-white/60">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-4 text-sm">Learning Path</h3>
          {['Beginner (0â€“3 mo)', 'Intermediate (3â€“6 mo)', 'Advanced (6â€“12 mo)', 'Expert (12+ mo)'].map((stage, i) => (
            <div key={stage} className="flex items-center gap-3 mb-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/30'}`}>{i+1}</div>
              <span className="text-sm text-white/60">{stage}</span>
            </div>
          ))}
        </div>
        <div className="glass rounded-xl p-5 border border-white/5">
          <h3 className="font-semibold text-white mb-4 text-sm">Certifications</h3>
          <ul className="space-y-2">
            {certs.map(c => (
              <li key={c} className="flex items-center gap-2 text-sm text-white/60">
                <span className="text-emerald-400">âœ“</span>{c}
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-fuchsia-600/10 rounded-lg border border-fuchsia-500/20">
            <p className="text-xs text-fuchsia-300">Lifecycle: <strong>{skill.lifecycle ?? 'Stable'}</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

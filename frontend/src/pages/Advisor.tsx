import { useEffect, useMemo, useRef, useState } from 'react'
import type { ElementType, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bot, Briefcase, Database, Lightbulb, Send, ShieldCheck, Sparkles, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkillReference, SkillSummary, skillsApi } from '@/services/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  id: number
  skills?: SkillReference[]
  queryType?: string
}

const defaultQuickPrompts = [
  'What should I learn after SQL?',
  'Which skills are future-proof?',
  'Compare Python and Power BI.',
  'Create a 6-month Data Analyst roadmap.',
  'Which skills are high-risk?',
]

function toReference(skill: SkillSummary): SkillReference {
  return {
    skill: skill.name,
    ses_score: skill.ses_score,
    ses_tier: skill.ses_tier,
    archetype: skill.archetype,
    forecast_trend: skill.forecast_trend,
    forecast_1y: skill.forecast_1y,
    sub_category: skill.category,
  }
}

function score(skill: SkillSummary) {
  return Math.round((skill.ses_score ?? 0) * 100)
}

function growth(skill: SkillSummary) {
  return Math.round((skill.growth_rate ?? 0) * 100)
}

function findMentionedSkills(message: string, skills: SkillSummary[]) {
  const lower = message.toLowerCase()
  return skills.filter((skill) => lower.includes(skill.name.toLowerCase())).slice(0, 3)
}

async function getGroundedResponse(message: string): Promise<Message> {
  const response = await skillsApi.list({ per_page: 200, sort_by: 'ses_score', sort_dir: 'desc' })
  const skills = response.items ?? []
  const lower = message.toLowerCase()
  const ranked = [...skills].sort((a, b) => (b.ses_score ?? 0) - (a.ses_score ?? 0))
  const rising = [...skills].sort((a, b) => (b.growth_rate ?? 0) - (a.growth_rate ?? 0))
  const mentioned = findMentionedSkills(message, skills)
  const anchor = mentioned[0] ?? skills.find((skill) => skill.name.toLowerCase() === 'python') ?? ranked[0]

  if (lower.includes('compare') || /\bvs\b|versus/.test(lower)) {
    const pair = mentioned.length >= 2 ? mentioned.slice(0, 2) : ranked.slice(0, 2)
    const [first, second] = pair
    return {
      role: 'assistant',
      id: Date.now() + 1,
      queryType: 'comparison',
      skills: pair.map(toReference),
      content: `${first.name} vs ${second.name}: ${first.name} has an SES score of ${score(first)}, ${growth(first)}% growth, and a ${first.forecast_trend ?? 'tracked'} forecast. ${second.name} has an SES score of ${score(second)}, ${growth(second)}% growth, and a ${second.forecast_trend ?? 'tracked'} forecast. For long-term safety, start with ${score(first) >= score(second) ? first.name : second.name}; use the other as a complementary skill when its category fits your target role.`,
    }
  }

  if (lower.includes('risk') || lower.includes('riviolet') || lower.includes('declin')) {
    const watch = [...skills].sort((a, b) => (a.ses_score ?? 1) - (b.ses_score ?? 1)).slice(0, 4)
    return {
      role: 'assistant',
      id: Date.now() + 1,
      queryType: 'risk',
      skills: watch.map(toReference),
      content: `The current watch list is led by ${watch.map((skill) => `${skill.name} (SES ${score(skill)})`).join(', ')}. These are lower relative safety signals in the processed dataset, usually paired with weaker demand, future-interest, or forecast features. Keep them as supporting knowledge and pair them with higher-SES anchors such as ${ranked.slice(0, 3).map((skill) => skill.name).join(', ')}.`,
    }
  }

  if (lower.includes('roadmap') || lower.includes('learn') || lower.includes('after')) {
    const recommendations = anchor
      ? [...skills].filter((skill) => skill.id !== anchor.id && (skill.category === anchor.category || (skill.growth_rate ?? 0) > 0.25)).sort((a, b) => (b.ses_score ?? 0) - (a.ses_score ?? 0)).slice(0, 4)
      : ranked.slice(0, 4)
    return {
      role: 'assistant',
      id: Date.now() + 1,
      queryType: 'roadmap',
      skills: [anchor, ...recommendations].filter(Boolean).slice(0, 4).map(toReference),
      content: `For a practical next step after ${anchor?.name ?? 'your current skill'}, spend the first stage building a small portfolio project with ${anchor?.name ?? 'a core skill'}. Then add ${recommendations.slice(0, 2).map((skill) => skill.name).join(' and ')} for breadth, followed by ${recommendations.slice(2, 4).map((skill) => skill.name).join(' and ') || 'a domain project'} for proof of application. The selected recommendations are drawn from the processed skill set using SES, growth, category fit, and forecast trend.`,
    }
  }

  if (lower.includes('future') || lower.includes('safe') || lower.includes('best')) {
    const leaders = ranked.slice(0, 4)
    return {
      role: 'assistant',
      id: Date.now() + 1,
      queryType: 'recommendation',
      skills: leaders.map(toReference),
      content: `The strongest safety signals in the current dataset are ${leaders.map((skill) => `${skill.name} (SES ${score(skill)})`).join(', ')}. These are not guarantees, but they combine comparatively stronger demand, salary premium, adoption, future-interest, and forecast features. Choose the one closest to your target role, then validate it with a project rather than collecting disconnected certificates.`,
    }
  }

  const contextual = mentioned.length ? mentioned : rising.slice(0, 4)
  return {
    role: 'assistant',
    id: Date.now() + 1,
    queryType: 'recommendation',
    skills: contextual.map(toReference),
    content: `${anchor?.name ?? 'This topic'} is currently tracked with SES ${anchor ? score(anchor) : 'N/A'}, ${anchor?.forecast_trend ?? 'a measured'} forecast trend, and ${anchor ? growth(anchor) : 0}% processed growth. For a useful next move, compare it with ${contextual.slice(1, 3).map((skill) => skill.name).join(' and ') || 'other skills in the same category'}, then build one project that demonstrates the adjacent skill combination.`,
  }
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
}

export default function Advisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ask me about skills, career paths, salary signals, roadmap choices, or risk exposure. I will ground answers in SES rankings, forecast outputs, industry analytics, and skill archetypes.',
      id: 0,
      queryType: 'welcome',
      skills: [],
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [quickPrompts, setQuickPrompts] = useState(defaultQuickPrompts)
  const [sourceSkill, setSourceSkill] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const recommended = useMemo(() => lastAssistant?.skills?.slice(0, 4) ?? [], [lastAssistant])

  useEffect(() => {
    const pendingPrompt = window.localStorage.getItem('skilllens:advisor-prompt')
    const context = window.localStorage.getItem('skilllens:advisor-context')
    if (context) {
      setSourceSkill(context)
      window.localStorage.removeItem('skilllens:advisor-context')
    }
    if (!pendingPrompt) return
    setInput(pendingPrompt)
    window.localStorage.removeItem('skilllens:advisor-prompt')
  }, [])

  useEffect(() => {
    Promise.all([skillsApi.topRising(2), skillsApi.extinctionRisk(1)])
      .then(([rising, risk]) => {
        const firstRising = rising[0]?.name
        const secondRising = rising[1]?.name
        const atRisk = risk[0]?.name
        setQuickPrompts([
          firstRising ? `Why is ${firstRising} growing so fast?` : defaultQuickPrompts[0],
          secondRising ? `How can I use ${secondRising} in a portfolio project?` : defaultQuickPrompts[1],
          'Compare Python and Power BI.',
          'Create a 6-month Data Analyst roadmap.',
          atRisk ? `Why is ${atRisk} on the risk watch list?` : defaultQuickPrompts[4],
        ])
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', content: text, id: Date.now() }
    setMessages((current) => [...current, userMsg])
    setInput('')
    setTyping(true)

    try {
      const groundedResponse = await getGroundedResponse(text)
      setMessages((current) => [...current, groundedResponse])
    } catch (err) {
      console.warn('Advisor data lookup failed:', err)
      setMessages((current) => [...current, {
        role: 'assistant',
        id: Date.now() + 1,
        queryType: 'unavailable',
        skills: [],
        content: 'The processed skill data is unavailable right now. Check the CSV Snapshot status, then try your question again.',
      }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-12rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_330px] animate-fade-in">
      <section className="glass flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/5">
        <div className="border-b border-white/6 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="page-title flex items-center gap-2.5">
                <Bot size={26} className="text-violet-300" strokeWidth={1.75} /> AI Career Advisor
              </h1>
              <p className="page-subtitle !mt-1">Grounded answers using SES rankings, forecasts, industries, and archetypes.</p>
              {sourceSkill && <p className="mt-2 text-xs text-fuchsia-200">Context from Skill Explorer: {sourceSkill}</p>}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
              <Sparkles size={12} /> RAG ready
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => <MessageBubble key={message.id} msg={message} />)}
              {typing && <TypingBubble />}
            </AnimatePresence>
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/6 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button key={prompt} onClick={() => send(prompt)} className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200 transition-colors hover:bg-violet-400/15">
                {prompt}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !event.shiftKey && send(input)}
              placeholder="Ask about skills, careers, salaries, or roadmaps..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || typing} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40">
              <Send size={18} />
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4 overflow-y-auto">
        <Panel title="Current context" icon={Lightbulb}>
          <InfoLine label="Selected goal" value={lastAssistant?.queryType === 'roadmap' ? 'Roadmap planning' : 'Skill strategy'} />
          <InfoLine label="Current skills" value={recommended.map((skill) => skill.skill).join(', ') || 'Not selected'} />
          <InfoLine label="Risk warning" value="Check low confidence and declining trend skills before committing." />
        </Panel>

        <Panel title="Recommended next skills" icon={ShieldCheck}>
          <div className="space-y-2">
            {recommended.length ? recommended.map((skill) => <SkillChip key={skill.skill} skill={skill} />) : <p className="text-sm text-white/38">Ask a question to populate grounded skill recommendations.</p>}
          </div>
        </Panel>

        <Panel title="Data-backed guidance" icon={Briefcase}>
          <div className="space-y-2">
            {recommended.length ? recommended.map((skill) => (
              <div key={skill.skill} className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
                <div className="flex items-start justify-between gap-2"><b className="text-sm text-white">{skill.skill}</b><span className="text-xs text-emerald-300">SES {skill.ses_score !== undefined ? Math.round(skill.ses_score * 100) : 'N/A'}</span></div>
                <p className="mt-2 text-xs text-white/42">{skill.sub_category ?? 'Tracked category'} - {skill.archetype ?? 'Tracked archetype'}</p>
                <p className="mt-1 text-xs text-white/42">Forecast: <span className="text-white/70">{skill.forecast_trend ?? 'Available in dataset'}</span></p>
              </div>
            )) : <p className="text-sm text-white/38">Submit a question to see data-backed skill guidance.</p>}
          </div>
        </Panel>

        <Panel title="Evidence sources" icon={Database}>
          {['SES Rankings', 'Forecast Results', 'Industry Analytics', 'Skill Archetypes'].map((source) => (
            <span key={source} className="mb-2 mr-2 inline-flex rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-xs text-fuchsia-200">
              {source}
            </span>
          ))}
        </Panel>
      </aside>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === 'assistant'
  const navigate = useNavigate()

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isAI ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500' : 'bg-white/10'}`}>
        {isAI ? <Bot size={16} className="text-white" /> : <User size={16} className="text-white/72" />}
      </div>
      <div className={`max-w-[78%] ${isAI ? '' : 'items-end'} flex flex-col gap-2`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isAI ? 'border border-white/8 bg-white/[0.045] text-white/78' : 'border border-violet-400/25 bg-violet-500/25 text-white'}`}>
          <p className="whitespace-pre-line">{msg.content.replace(/\*\*/g, '')}</p>
          {isAI && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['SES Rankings', 'Forecast Results', 'Industry Analytics', 'Skill Archetypes'].map((source) => (
                <span key={source} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">{source}</span>
              ))}
            </div>
          )}
        </div>
        {isAI && msg.skills && msg.skills.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {msg.skills.slice(0, 4).map((skill) => (
              <button key={skill.skill} onClick={() => navigate(`/skills/${slugify(skill.skill)}`)} className="rounded-xl border border-white/8 bg-white/[0.035] p-3 text-left transition-colors hover:border-violet-400/35">
                <b className="text-sm text-white">{skill.skill}</b>
                <p className="mt-1 text-xs text-white/42">{skill.sub_category ?? 'Tracked skill'} - {skill.forecast_trend ?? 'Forecasted'}</p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-emerald-300">SES {skill.ses_score !== undefined ? Math.round(skill.ses_score * 100) : 'N/A'}</span>
                  <span className="inline-flex items-center gap-1 text-violet-300">Open <ArrowRight size={11} /></span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function TypingBubble() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500">
        <Bot size={16} className="text-white" />
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-violet-300" style={{ animationDelay: `${i * 0.12}s` }} />)}
        </div>
      </div>
    </motion.div>
  )
}

function Panel({ title, icon: Icon, children }: { title: string; icon: ElementType; children: ReactNode }) {
  return (
    <section className="glass rounded-xl border border-white/5 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/84"><Icon size={15} className="text-fuchsia-300" />{title}</h3>
      {children}
    </section>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-1 text-sm text-white/68">{value}</p>
    </div>
  )
}

function SkillChip({ skill }: { skill: SkillReference }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm text-white">{skill.skill}</b>
        <span className="text-xs text-emerald-300">{skill.ses_score !== undefined ? Math.round(skill.ses_score * 100) : 'N/A'}</span>
      </div>
      <p className="mt-1 text-xs text-white/38">{skill.archetype ?? 'Tracked'} - {skill.forecast_trend ?? 'Forecasted'}</p>
    </div>
  )
}

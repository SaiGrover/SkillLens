import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Loader, Presentation, Table } from 'lucide-react'
import { csvSnapshotMetadata, reportCsvById } from '@/data/fallbackData'

const reportTypes = [
  { id: 'skill-forecast', title: 'Skill Forecast Report', desc: '1Y and 3Y forecast indexes, model method mix, confidence, and trend categories.', deck: 'R1_Skill_Forecast_Export.pptx' },
  { id: 'industry', title: 'Industry Analytics Report', desc: 'Industry rankings, average SES, forecast growth, top skills, and risk distribution notes.', deck: 'R2_Industry_Analytics_Export.pptx' },
  { id: 'salary', title: 'Salary Signal Report', desc: 'Salary premium signals, demand leaders, compensation leverage, and interpretation notes.', deck: 'R3_Salary_Signal_Export.pptx' },
  { id: 'automation', title: 'Risk and SES Report', desc: 'SES tiers, safest skills, watch-list skills, archetypes, and explainability guidance.', deck: 'R4_Risk_SES_Export.pptx' },
  { id: 'global', title: 'Regional Demand Report', desc: 'Global adoption leaders, country coverage, adoption scores, and time-series demand context.', deck: 'R5_Regional_Demand_Export.pptx' },
  { id: 'career', title: 'Career Advisor Notes', desc: 'RAG source grounding, answer structure, source chips, and high-safety skill references.', deck: 'R6_Career_Advisor_Notes.pptx' },
]

export default function Reports() {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<string[]>([])

  const handleDownload = (id: string) => {
    setDownloading(id)
    const content = reportCsvById[id] ?? ''
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skilllens-${id}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(null)
    setDownloaded(prev => [...new Set([...prev, id])])
  }

  const markPdfDownloaded = (id: string) => {
    setDownloaded(prev => [...new Set([...prev, id])])
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-2.5">
          <FileText size={26} className="text-amber-300" strokeWidth={1.75} /> Reports Center
        </h1>
        <p className="page-subtitle">
          Downloadable PowerPoint reports supplied from the project report pack. Snapshot includes {csvSnapshotMetadata.skill_count} skills and {csvSnapshotMetadata.history_records.toLocaleString()} skill-year rows.
        </p>
      </div>

      <div className="glass rounded-xl border border-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Project report pack</p>
            <p className="mt-1 text-xs text-white/40">Six editable PowerPoint exports from the supplied `backend/data/Reports` folder.</p>
          </div>
          <a
            href="/reports/SkillLens_Report_Pack.zip"
            download="SkillLens_Report_Pack.zip"
            onClick={() => markPdfDownloaded('deck')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:border-amber-300/45 hover:bg-amber-400/15"
          >
            <Presentation size={15} /> Download PowerPoint Pack
          </a>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {reportTypes.map((report, i) => {
          const isLoading = downloading === report.id
          const isDone = downloaded.includes(report.id)

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/55">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-white mb-1">{report.title}</h3>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">PPTX</span>
                  </div>
                  <p className="text-xs text-white/40 mb-4 leading-relaxed">{report.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/reports/${report.deck}`}
                      download={report.deck}
                      onClick={() => markPdfDownloaded(report.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isDone
                          ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border border-white/10 text-white/75 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <Download size={12} />
                      {isDone ? 'Downloaded PPTX' : 'Download PPTX'}
                    </a>
                    <button
                      onClick={() => handleDownload(report.id)}
                      disabled={!!downloading}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 transition-all hover:text-white/65 hover:border-white/20 disabled:opacity-50"
                    >
                      {isLoading ? <Loader size={12} className="animate-spin" /> : <Table size={12} />}
                      CSV
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

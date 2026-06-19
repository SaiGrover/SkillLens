import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Landing from '@/pages/Landing'
import Dashboard from '@/pages/Dashboard'
import Skills from '@/pages/Skills'
import SkillsGuide from '@/pages/SkillsGuide'
import SkillDetail from '@/pages/SkillDetail'
import Advisor from '@/pages/Advisor'
import Roadmaps from '@/pages/Roadmaps'
import Global from '@/pages/Global'
import Forecasts from '@/pages/Forecasts'
import Industries from '@/pages/Industries'
import Reports from '@/pages/Reports'
import Approach from '@/pages/Approach'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="skills" element={<Skills />} />
          <Route path="skills-guide" element={<SkillsGuide />} />
          <Route path="skills/:id" element={<SkillDetail />} />
          <Route path="advisor" element={<Advisor />} />
          <Route path="roadmaps" element={<Roadmaps />} />
          <Route path="global" element={<Global />} />
          <Route path="forecasts" element={<Forecasts />} />
          <Route path="industries" element={<Industries />} />
          <Route path="reports" element={<Reports />} />
          <Route path="methodology" element={<Approach />} />
          <Route path="approach" element={<Approach />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

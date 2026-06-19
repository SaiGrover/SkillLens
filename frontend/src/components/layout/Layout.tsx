import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ConstellationBackground from '@/components/background/ConstellationBackground'

export default function Layout() {
  const location = useLocation()
  const compactPage = location.pathname === '/skills'
  const hideTopBar = compactPage || location.pathname === '/advisor'

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#020412]">
      <ConstellationBackground />
      <Sidebar />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {!hideTopBar && <TopBar />}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="app-content flex-1 overflow-y-auto p-5 md:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}

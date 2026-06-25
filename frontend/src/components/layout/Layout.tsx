import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import ConstellationBackground from '@/components/background/ConstellationBackground'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="inner-shell relative flex h-screen flex-col overflow-hidden bg-[#080411]">
      <ConstellationBackground />
      <Sidebar />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
          className="app-content flex-1 overflow-y-auto p-4 md:p-5 xl:p-6"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/', label: 'Accueil', emoji: '🏠' },
  { path: '/mood', label: 'Mood', emoji: '🧠' },
  { path: '/sleep', label: 'Sommeil', emoji: '😴' },
  { path: '/nutrition', label: 'Nutrition', emoji: '🥗' },
  { path: '/sport', label: 'Sport', emoji: '🏋️' },
  { path: '/learning', label: 'Apprendre', emoji: '📚' },
  { path: '/dashboard', label: 'Stats', emoji: '📊' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
    >
      <div className="mx-3 mb-3 bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border)] rounded-2xl shadow-2xl">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="relative flex flex-col items-center px-1 py-1.5 transition-all duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-1 w-6 h-0.5 bg-[var(--accent-purple)] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`text-lg transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                  {item.emoji}
                </span>
                <span className={`text-[9px] mt-0.5 transition-colors duration-200 ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                }`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}
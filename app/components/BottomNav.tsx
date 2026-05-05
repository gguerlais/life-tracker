'use client'

import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { path: '/', label: 'Accueil', emoji: '🏠' },
  { path: '/mood', label: 'Mood', emoji: '🧠' },
  { path: '/sleep', label: 'Sommeil', emoji: '😴' },
  { path: '/nutrition', label: 'Nutrition', emoji: '🥗' },
  { path: '/sport', label: 'Sport', emoji: '🏋️' },
  { path: '/learning', label: 'Apprendre', emoji: '📚' },
  { path: '/dashboard', label: 'Dashboard', emoji: '📊' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 sm:hidden">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center px-1 py-1 transition ${
              pathname === item.path ? 'text-black' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{item.emoji}</span>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
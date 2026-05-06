'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from './components/PageTransition'
import { motion } from 'framer-motion'

const modules = [
  { path: '/mood', emoji: '🧠', label: 'Mood', desc: 'Comment tu te sens ?', gradient: 'from-purple-500/20 to-pink-500/20', border: 'hover:border-purple-500/50' },
  { path: '/sleep', emoji: '😴', label: 'Sommeil', desc: 'Logge ta nuit', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'hover:border-blue-500/50' },
  { path: '/nutrition', emoji: '🥗', label: 'Nutrition', desc: 'Enregistre un repas', gradient: 'from-orange-500/20 to-yellow-500/20', border: 'hover:border-orange-500/50' },
  { path: '/sport', emoji: '🏋️', label: 'Sport', desc: 'Logge une séance', gradient: 'from-red-500/20 to-orange-500/20', border: 'hover:border-red-500/50' },
  { path: '/learning', emoji: '📚', label: 'Apprentissage', desc: "Session d'étude", gradient: 'from-indigo-500/20 to-blue-500/20', border: 'hover:border-indigo-500/50' },
  { path: '/analytics', emoji: '📊', label: 'Analytics', desc: 'Tes tendances', gradient: 'from-green-500/20 to-emerald-500/20', border: 'hover:border-green-500/50' },]

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <div className="flex justify-between items-center mb-10">
          <div>
            <p className="text-[var(--text-tertiary)] text-sm">{greeting} 👋</p>
            <h1 className="text-3xl font-bold mt-1">Life Tracker</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--text-tertiary)]"
          >
            Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {modules.map((item, i) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => router.push(item.path)}
              className={`bg-gradient-to-br ${item.gradient} bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] ${item.border} transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98]`}
            >
              <span className="text-3xl">{item.emoji}</span>
              <p className="font-semibold mt-3 text-[var(--text-primary)]">{item.label}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
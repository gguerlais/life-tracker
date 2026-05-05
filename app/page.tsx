'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Life Tracker</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          Déconnexion
        </button>
      </div>

      <p className="text-gray-500 mb-6">Bonjour 👋 Que veux-tu tracker ?</p>

      <div className="grid grid-cols-2 gap-4">
        {[
          { path: '/mood', emoji: '🧠', label: 'Mood', desc: 'Comment tu te sens ?' },
          { path: '/sleep', emoji: '😴', label: 'Sommeil', desc: 'Logge ta nuit' },
          { path: '/nutrition', emoji: '🥗', label: 'Nutrition', desc: 'Enregistre un repas' },
          { path: '/sport', emoji: '🏋️', label: 'Sport', desc: 'Logge une séance' },
          { path: '/learning', emoji: '📚', label: 'Apprentissage', desc: 'Session d\'étude' },
          { path: '/dashboard', emoji: '📊', label: 'Dashboard', desc: 'Tes tendances' },
        ].map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="bg-white p-5 rounded-lg shadow hover:shadow-md transition text-left"
          >
            <span className="text-3xl">{item.emoji}</span>
            <p className="font-medium mt-2">{item.label}</p>
            <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
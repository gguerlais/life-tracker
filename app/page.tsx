'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

const moods = [
  { score: 1, emoji: '😞', label: 'Très mal' },
  { score: 2, emoji: '😕', label: 'Pas top' },
  { score: 3, emoji: '😐', label: 'Neutre' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '😄', label: 'Super' },
]

type MoodCheck = {
  id: string
  score: number
  note: string | null
  created_at: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [todayMoods, setTodayMoods] = useState<MoodCheck[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadTodayMoods(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadTodayMoods = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
    setTodayMoods(data || [])
  }

  const submitMood = async (score: number) => {
    if (!user) return
    await supabase.from('mood_checks').insert({
      user_id: user.id,
      score,
      note: note || null,
    })
    setNote('')
    loadTodayMoods(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Life Tracker</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">
          Déconnexion
        </button>
      </div>

      {/* Mood input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Comment tu te sens ?</h2>
        <div className="flex justify-between mb-4">
          {moods.map((mood) => (
            <button
              key={mood.score}
              onClick={() => submitMood(mood.score)}
              className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className="text-xs text-gray-500 mt-1">{mood.label}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Une note ? (optionnel)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-2 border rounded text-sm"
        />
      </div>

      {/* Today's moods */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
        {todayMoods.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun check pour le moment</p>
        ) : (
          <div className="space-y-3">
            {todayMoods.map((mood) => (
              <div key={mood.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {moods.find((m) => m.score === mood.score)?.emoji}
                  </span>
                  {mood.note && <span className="text-gray-600">{mood.note}</span>}
                </div>
                <span className="text-gray-400">
                  {new Date(mood.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
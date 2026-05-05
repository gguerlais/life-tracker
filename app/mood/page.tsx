'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

const moods = [
  { score: 1, emoji: '😞', label: 'Très mal', color: 'from-red-500/20 to-red-600/20' },
  { score: 2, emoji: '😕', label: 'Pas top', color: 'from-orange-500/20 to-orange-600/20' },
  { score: 3, emoji: '😐', label: 'Neutre', color: 'from-yellow-500/20 to-yellow-600/20' },
  { score: 4, emoji: '🙂', label: 'Bien', color: 'from-green-500/20 to-green-600/20' },
  { score: 5, emoji: '😄', label: 'Super', color: 'from-emerald-500/20 to-emerald-600/20' },
]

type MoodCheck = {
  id: string
  score: number
  note: string | null
  created_at: string
}

export default function MoodPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [todayMoods, setTodayMoods] = useState<MoodCheck[]>([])
  const [weekMoods, setWeekMoods] = useState<MoodCheck[]>([])
  const [justSubmitted, setJustSubmitted] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadMoods(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadMoods = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
    setTodayMoods(todayData || [])

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: weekData } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })
    setWeekMoods(weekData || [])
  }

  const submitMood = async (score: number) => {
    if (!user) return
    setJustSubmitted(score)
    await supabase.from('mood_checks').insert({
      user_id: user.id,
      score,
      note: note || null,
    })
    setNote('')
    loadMoods(user.id)
    setTimeout(() => setJustSubmitted(null), 800)
  }

  const deleteMood = async (id: string) => {
    await supabase.from('mood_checks').delete().eq('id', id)
    if (user) loadMoods(user.id)
  }

  const weekAvg = weekMoods.length > 0
    ? (weekMoods.reduce((a, b) => a + b.score, 0) / weekMoods.length).toFixed(1)
    : null

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🧠 Mood</h1>

        {/* Mood input */}
        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-5">Comment tu te sens ?</h2>
          <div className="flex justify-between mb-5">
            {moods.map((mood) => (
              <motion.button
                key={mood.score}
                whileTap={{ scale: 0.85 }}
                onClick={() => submitMood(mood.score)}
                className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-200 bg-gradient-to-b ${
                  justSubmitted === mood.score ? mood.color + ' scale-110' : 'hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <span className="text-3xl">{mood.emoji}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] mt-1.5">{mood.label}</span>
              </motion.button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Une note ? (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 rounded-xl text-sm"
          />
        </Card>

        {/* Week average */}
        {weekAvg && (
          <Card className="mb-5 text-center" delay={0.1}>
            <p className="text-xs text-[var(--text-tertiary)]">Moyenne sur 7 jours</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-blue)] bg-clip-text text-transparent mt-2">
              {weekAvg}
            </p>
            <p className="text-2xl mt-1">{moods.find((m) => m.score === Math.round(Number(weekAvg)))?.emoji}</p>
          </Card>
        )}

        {/* Today's moods */}
        <Card delay={0.2}>
          <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
          {todayMoods.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucun check pour le moment</p>
          ) : (
            <div className="space-y-3">
              {todayMoods.map((mood, i) => (
                <motion.div
                  key={mood.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between text-sm bg-[var(--bg-secondary)] p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{moods.find((m) => m.score === mood.score)?.emoji}</span>
                    {mood.note && <span className="text-[var(--text-secondary)]">{mood.note}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-tertiary)] text-xs">
                      {new Date(mood.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button onClick={() => deleteMood(mood.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
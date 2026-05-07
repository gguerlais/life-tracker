'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

type SportSessionWithExercises = {
  id: string
  date: string
  type: string
  duration_min: number | null
  sport_session_exercises: {
    reps: number | null
    weight_kg: number | null
    duration_min: number | null
    exercises_library: { category: string } | null
  }[]
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  const [moodAvg, setMoodAvg] = useState<number | null>(null)
  const [sleepAvg, setSleepAvg] = useState<number | null>(null)
  const [sleepQualityAvg, setSleepQualityAvg] = useState<number | null>(null)
  const [nutritionAvg, setNutritionAvg] = useState<number | null>(null)
  const [sportSessions, setSportSessions] = useState(0)
  const [totalWeight, setTotalWeight] = useState(0)
  const [cardioMinutes, setCardioMinutes] = useState(0)
  const [learningMinutes, setLearningMinutes] = useState(0)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadAll(user.id, period)
      }
      setLoading(false)
    })
  }, [router, period])

  const getStartDate = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  const loadAll = async (userId: string, days: number) => {
    const startDate = getStartDate(days)

    // Mood
    const { data: moods } = await supabase
      .from('mood_checks').select('score').eq('user_id', userId).gte('created_at', startDate)
    if (moods && moods.length > 0) {
      setMoodAvg(Math.round((moods.reduce((a, b) => a + b.score, 0) / moods.length) * 10) / 10)
    } else { setMoodAvg(null) }

    // Sleep
    const { data: sleeps } = await supabase
      .from('sleep_logs').select('bedtime, wake_time, quality').eq('user_id', userId).gte('date', startDate)
    if (sleeps && sleeps.length > 0) {
      const durations = sleeps.map((s) => {
        const [bh, bm] = s.bedtime.split(':').map(Number)
        const [wh, wm] = s.wake_time.split(':').map(Number)
        let totalMin = (wh * 60 + wm) - (bh * 60 + bm)
        if (totalMin < 0) totalMin += 24 * 60
        return totalMin / 60
      })
      setSleepAvg(Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10)
      setSleepQualityAvg(Math.round((sleeps.reduce((a, b) => a + b.quality, 0) / sleeps.length) * 10) / 10)
    } else { setSleepAvg(null); setSleepQualityAvg(null) }

    // Nutrition
    const { data: nutrition } = await supabase
      .from('nutrition_logs').select('score').eq('user_id', userId).gte('date', startDate)
    if (nutrition && nutrition.length > 0) {
      setNutritionAvg(Math.round((nutrition.reduce((a, b) => a + b.score, 0) / nutrition.length) * 10) / 10)
    } else { setNutritionAvg(null) }

    // Sport
    const { data: sport } = await supabase
      .from('sport_sessions')
      .select('id, date, type, duration_min, sport_session_exercises ( reps, weight_kg, duration_min, exercises_library ( category ) )')
      .eq('user_id', userId).gte('date', startDate)
    if (sport) {
      setSportSessions(sport.length)
      let weight = 0
      let cardio = 0
      for (const session of sport as unknown as SportSessionWithExercises[]) {
        for (const ex of session.sport_session_exercises) {
          const cat = ex.exercises_library?.category
          if (cat === 'cardio' && ex.duration_min) {
            cardio += ex.duration_min
          }
          if (ex.weight_kg && ex.reps) {
            weight += ex.weight_kg * ex.reps
          }
        }
      }
      setTotalWeight(Math.round(weight))
      setCardioMinutes(cardio)
    } else { setSportSessions(0); setTotalWeight(0); setCardioMinutes(0) }

    // Learning
    const { data: learning } = await supabase
      .from('learning_sessions').select('duration_min').eq('user_id', userId).gte('date', startDate)
    if (learning) {
      setLearningMinutes(learning.reduce((a, b) => a + b.duration_min, 0))
    } else { setLearningMinutes(0) }
  }

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}T`
    return `${kg}kg`
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-6">📊 Analytics</h1>

        <div className="flex gap-2 mb-8">
          {[7, 14, 30].map((d) => (
            <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setPeriod(d)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                period === d ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >{d}j</motion.button>
          ))}
        </div>

        {/* Mood */}
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <p className="font-semibold text-sm">Mood</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Score moyen</p>
              </div>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-pink)] bg-clip-text text-transparent">
              {moodAvg !== null ? `${moodAvg}/5` : '—'}
            </p>
          </div>
        </Card>

        {/* Sleep */}
        <Card className="mb-4" delay={0.05}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">😴</span>
              <div>
                <p className="font-semibold text-sm">Sommeil</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Durée · Qualité</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[var(--accent-blue)]">{sleepAvg !== null ? `${sleepAvg}h` : '—'}</p>
              {sleepQualityAvg !== null && <p className="text-xs text-[var(--text-tertiary)]">Qualité {sleepQualityAvg}/5</p>}
            </div>
          </div>
        </Card>

        {/* Nutrition */}
        <Card className="mb-4" delay={0.1}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🥗</span>
              <div>
                <p className="font-semibold text-sm">Nutrition</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Score moyen</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--accent-orange)]">
              {nutritionAvg !== null ? `${nutritionAvg}/5` : '—'}
            </p>
          </div>
        </Card>

        {/* Sport — clickable */}
        <motion.div whileTap={{ scale: 0.98 }} onClick={() => router.push(`/analytics/sport?period=${period}`)}>
          <Card className="mb-4 cursor-pointer hover:border-[var(--accent-red)]/50 transition-colors" delay={0.15}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏋️</span>
                <div>
                  <p className="font-semibold text-sm">Sport</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Voir le détail →</p>
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] text-lg">›</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[var(--accent-red)]">{sportSessions}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">séances</p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[var(--accent-red)]">{formatWeight(totalWeight)}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">soulevés</p>
              </div>
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[var(--accent-red)]">{cardioMinutes}</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">min cardio</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Dashboard / Insights — clickable */}
        <motion.div whileTap={{ scale: 0.98 }} onClick={() => router.push('/analytics/insights')}>
          <Card className="mb-4 cursor-pointer hover:border-[var(--accent-purple)]/50 transition-colors" delay={0.17}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-semibold text-sm">Dashboard</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Résumé hebdo + insights →</p>
                </div>
              </div>
              <span className="text-[var(--text-tertiary)] text-lg">›</span>
            </div>
          </Card>
        </motion.div>

        {/* Learning */}
        <Card className="mb-4" delay={0.2}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-semibold text-sm">Apprentissage</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">Temps total</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--accent-purple)]">
              {learningMinutes > 0 ? `${learningMinutes}min` : '—'}
            </p>
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
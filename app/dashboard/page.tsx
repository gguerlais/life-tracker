'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

type MoodData = { date: string; avg: number }
type SleepData = { date: string; duration: number; quality: number }
type NutritionData = { date: string; avg_score: number }
type SportData = { date: string; duration: number }
type LearningData = { date: string; duration: number }

const customTooltipStyle = {
  backgroundColor: '#1c1c1e',
  border: '1px solid #2c2c2e',
  borderRadius: '12px',
  padding: '8px 12px',
  color: '#f5f5f7',
  fontSize: '12px',
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  const [moodData, setMoodData] = useState<MoodData[]>([])
  const [sleepData, setSleepData] = useState<SleepData[]>([])
  const [nutritionData, setNutritionData] = useState<NutritionData[]>([])
  const [sportData, setSportData] = useState<SportData[]>([])
  const [learningData, setLearningData] = useState<LearningData[]>([])

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const loadAll = async (userId: string, days: number) => {
    const startDate = getStartDate(days)

    const { data: moods } = await supabase.from('mood_checks').select('*').eq('user_id', userId).gte('created_at', startDate).order('created_at')
    if (moods) {
      const byDate: Record<string, number[]> = {}
      moods.forEach((m: { created_at: string; score: number }) => {
        const date = m.created_at.split('T')[0]
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(m.score)
      })
      setMoodData(Object.entries(byDate).map(([date, scores]) => ({
        date: formatDate(date),
        avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      })))
    }

    const { data: sleeps } = await supabase.from('sleep_logs').select('*').eq('user_id', userId).gte('date', startDate).order('date')
    if (sleeps) {
      setSleepData(sleeps.map((s: { date: string; bedtime: string; wake_time: string; quality: number }) => {
        const [bh, bm] = s.bedtime.split(':').map(Number)
        const [wh, wm] = s.wake_time.split(':').map(Number)
        let totalMin = (wh * 60 + wm) - (bh * 60 + bm)
        if (totalMin < 0) totalMin += 24 * 60
        return { date: formatDate(s.date), duration: Math.round(totalMin / 60 * 10) / 10, quality: s.quality }
      }))
    }

    const { data: nutrition } = await supabase.from('nutrition_logs').select('*').eq('user_id', userId).gte('date', startDate).order('date')
    if (nutrition) {
      const byDate: Record<string, number[]> = {}
      nutrition.forEach((n: { date: string; score: number }) => {
        if (!byDate[n.date]) byDate[n.date] = []
        byDate[n.date].push(n.score)
      })
      setNutritionData(Object.entries(byDate).map(([date, scores]) => ({
        date: formatDate(date),
        avg_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      })))
    }

    const { data: sport } = await supabase.from('sport_sessions').select('*').eq('user_id', userId).gte('date', startDate).order('date')
    if (sport) {
      setSportData(sport.map((s: { date: string; duration_min: number | null }) => ({
        date: formatDate(s.date), duration: s.duration_min || 0,
      })))
    }

    const { data: learning } = await supabase.from('learning_sessions').select('*').eq('user_id', userId).gte('date', startDate).order('date')
    if (learning) {
      const byDate: Record<string, number> = {}
      learning.forEach((l: { date: string; duration_min: number }) => {
        if (!byDate[l.date]) byDate[l.date] = 0
        byDate[l.date] += l.duration_min
      })
      setLearningData(Object.entries(byDate).map(([date, duration]) => ({
        date: formatDate(date), duration,
      })))
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-2xl mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

        <div className="flex gap-2 mb-8">
          {[7, 14, 30].map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPeriod(d)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                period === d
                  ? 'bg-[var(--accent-green)] text-black'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {d}j
            </motion.button>
          ))}
        </div>

        {/* Summary */}
        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-4">Résumé</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-500/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-pink)] bg-clip-text text-transparent">
                {moodData.length > 0 ? (moodData.reduce((a, b) => a + b.avg, 0) / moodData.length).toFixed(1) : '—'}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Mood moyen</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-blue)]">
                {sleepData.length > 0 ? (sleepData.reduce((a, b) => a + b.duration, 0) / sleepData.length).toFixed(1) + 'h' : '—'}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Sommeil moyen</p>
            </div>
            <div className="bg-orange-500/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-orange)]">
                {nutritionData.length > 0 ? (nutritionData.reduce((a, b) => a + b.avg_score, 0) / nutritionData.length).toFixed(1) : '—'}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Nutrition</p>
            </div>
            <div className="bg-red-500/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-red)]">{sportData.length}</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Séances sport</p>
            </div>
            <div className="bg-indigo-500/10 rounded-xl p-4 text-center col-span-2">
              <p className="text-2xl font-bold text-[var(--accent-purple)]">{learningData.reduce((a, b) => a + b.duration, 0)} min</p>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Temps d&apos;étude</p>
            </div>
          </div>
        </Card>

        {/* Mood chart */}
        <Card className="mb-5" delay={0.1}>
          <h2 className="text-base font-semibold mb-1">🧠 Mood</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Score moyen par jour</p>
          {moodData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={moodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="avg" stroke="#bf5af2" strokeWidth={2} dot={{ r: 3, fill: '#bf5af2' }} name="Mood" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Sleep chart */}
        <Card className="mb-5" delay={0.15}>
          <h2 className="text-base font-semibold mb-1">😴 Sommeil</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Durée (h) et qualité</p>
          {sleepData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sleepData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="duration" stroke="#64d2ff" strokeWidth={2} dot={{ r: 3, fill: '#64d2ff' }} name="Durée (h)" />
                <Line type="monotone" dataKey="quality" stroke="#30d158" strokeWidth={2} dot={{ r: 3, fill: '#30d158' }} name="Qualité" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Nutrition chart */}
        <Card className="mb-5" delay={0.2}>
          <h2 className="text-base font-semibold mb-1">🥗 Nutrition</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Score moyen par jour</p>
          {nutritionData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={nutritionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="avg_score" stroke="#ff9f0a" strokeWidth={2} dot={{ r: 3, fill: '#ff9f0a' }} name="Score" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Sport chart */}
        <Card className="mb-5" delay={0.25}>
          <h2 className="text-base font-semibold mb-1">🏋️ Sport</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Durée des séances (min)</p>
          {sportData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sportData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="duration" fill="#ff453a" radius={[6, 6, 0, 0]} name="Durée (min)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Learning chart */}
        <Card className="mb-5" delay={0.3}>
          <h2 className="text-base font-semibold mb-1">📚 Apprentissage</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Temps d&apos;étude par jour (min)</p>
          {learningData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={learningData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="duration" fill="#6366f1" radius={[6, 6, 0, 0]} name="Durée (min)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
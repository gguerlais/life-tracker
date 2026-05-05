'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type MoodData = { date: string; avg: number; count: number }
type SleepData = { date: string; duration: number; quality: number }
type NutritionData = { date: string; avg_score: number; meals: number }
type SportData = { date: string; duration: number; type: string }
type LearningData = { date: string; duration: number }

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

  const loadAll = async (userId: string, days: number) => {
    const startDate = getStartDate(days)

    // Mood
    const { data: moods } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .order('created_at')

    if (moods) {
      const byDate: Record<string, number[]> = {}
      moods.forEach((m: { created_at: string; score: number }) => {
        const date = m.created_at.split('T')[0]
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(m.score)
      })
      setMoodData(
        Object.entries(byDate).map(([date, scores]) => ({
          date: formatDate(date),
          avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          count: scores.length,
        }))
      )
    }

    // Sleep
    const { data: sleeps } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date')

    if (sleeps) {
      setSleepData(
        sleeps.map((s: { date: string; bedtime: string; wake_time: string; quality: number }) => {
          const [bh, bm] = s.bedtime.split(':').map(Number)
          const [wh, wm] = s.wake_time.split(':').map(Number)
          let totalMin = (wh * 60 + wm) - (bh * 60 + bm)
          if (totalMin < 0) totalMin += 24 * 60
          return {
            date: formatDate(s.date),
            duration: Math.round(totalMin / 60 * 10) / 10,
            quality: s.quality,
          }
        })
      )
    }

    // Nutrition
    const { data: nutrition } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date')

    if (nutrition) {
      const byDate: Record<string, number[]> = {}
      nutrition.forEach((n: { date: string; score: number }) => {
        if (!byDate[n.date]) byDate[n.date] = []
        byDate[n.date].push(n.score)
      })
      setNutritionData(
        Object.entries(byDate).map(([date, scores]) => ({
          date: formatDate(date),
          avg_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
          meals: scores.length,
        }))
      )
    }

    // Sport
    const { data: sport } = await supabase
      .from('sport_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date')

    if (sport) {
      setSportData(
        sport.map((s: { date: string; duration_min: number | null; type: string }) => ({
          date: formatDate(s.date),
          duration: s.duration_min || 0,
          type: s.type,
        }))
      )
    }

    // Learning
    const { data: learning } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date')

    if (learning) {
      const byDate: Record<string, number> = {}
      learning.forEach((l: { date: string; duration_min: number }) => {
        if (!byDate[l.date]) byDate[l.date] = 0
        byDate[l.date] += l.duration_min
      })
      setLearningData(
        Object.entries(byDate).map(([date, duration]) => ({
          date: formatDate(date),
          duration,
        }))
      )
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-sm text-gray-500 underline">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-6">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setPeriod(d)}
            className={`px-4 py-1 rounded-lg text-sm transition ${
              period === d ? 'bg-black text-white' : 'bg-white border hover:bg-gray-100'
            }`}
          >
            {d}j
          </button>
        ))}
      </div>

      {/* Mood */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">🧠 Mood</h2>
        <p className="text-xs text-gray-400 mb-3">Score moyen par jour (1-5)</p>
        {moodData.length === 0 ? (
          <p className="text-gray-400 text-sm">Pas de données</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={moodData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Mood moyen" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sleep */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">😴 Sommeil</h2>
        <p className="text-xs text-gray-400 mb-3">Durée (heures) et qualité (1-5)</p>
        {sleepData.length === 0 ? (
          <p className="text-gray-400 text-sm">Pas de données</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sleepData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="duration" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Durée (h)" />
              <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Qualité" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Nutrition */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">🥗 Nutrition</h2>
        <p className="text-xs text-gray-400 mb-3">Score moyen par jour (1-5)</p>
        {nutritionData.length === 0 ? (
          <p className="text-gray-400 text-sm">Pas de données</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={nutritionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Score moyen" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sport */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">🏋️ Sport</h2>
        <p className="text-xs text-gray-400 mb-3">Durée des séances (min)</p>
        {sportData.length === 0 ? (
          <p className="text-gray-400 text-sm">Pas de données</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sportData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="duration" fill="#ef4444" radius={[4, 4, 0, 0]} name="Durée (min)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Learning */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-1">📚 Apprentissage</h2>
        <p className="text-xs text-gray-400 mb-3">Temps d&apos;étude par jour (min)</p>
        {learningData.length === 0 ? (
          <p className="text-gray-400 text-sm">Pas de données</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={learningData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="duration" fill="#6366f1" radius={[4, 4, 0, 0]} name="Durée (min)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Streaks summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">📊 Résumé de la période</h2>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-purple-600">
              {moodData.length > 0
                ? (moodData.reduce((a, b) => a + b.avg, 0) / moodData.length).toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Mood moyen</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-blue-600">
              {sleepData.length > 0
                ? (sleepData.reduce((a, b) => a + b.duration, 0) / sleepData.length).toFixed(1) + 'h'
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Sommeil moyen</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-600">
              {nutritionData.length > 0
                ? (nutritionData.reduce((a, b) => a + b.avg_score, 0) / nutritionData.length).toFixed(1)
                : '—'}
            </p>
            <p className="text-xs text-gray-500">Nutrition moyenne</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-600">
              {sportData.length}
            </p>
            <p className="text-xs text-gray-500">Séances sport</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 col-span-2">
            <p className="text-2xl font-bold text-indigo-600">
              {learningData.reduce((a, b) => a + b.duration, 0)} min
            </p>
            <p className="text-xs text-gray-500">Temps d&apos;étude total</p>
          </div>
        </div>
      </div>
    </div>
  )
}
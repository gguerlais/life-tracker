'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

const mealTypes = [
  { value: 'petit-dej', label: '🌅 Petit-déj' },
  { value: 'dejeuner', label: '☀️ Déjeuner' },
  { value: 'diner', label: '🌙 Dîner' },
  { value: 'snack', label: '🍎 Snack' },
]

const availableTags = [
  'Équilibré', 'Trop gras', 'Trop sucré', 'Léger',
  'Fait maison', 'Fast food', 'Beaucoup de légumes',
  'Protéiné', 'Pas assez mangé', 'Trop mangé',
]

const scores = [
  { score: 1, emoji: '🔴', label: 'Mauvais' },
  { score: 2, emoji: '🟠', label: 'Bof' },
  { score: 3, emoji: '🟡', label: 'Moyen' },
  { score: 4, emoji: '🟢', label: 'Bien' },
  { score: 5, emoji: '💚', label: 'Top' },
]

type NutritionLog = {
  id: string
  date: string
  meal_type: string
  tags: string[]
  hydration: boolean
  score: number
  note: string | null
  created_at: string
}

export default function NutritionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hydration, setHydration] = useState(false)
  const [score, setScore] = useState(0)
  const [note, setNote] = useState('')
  const [todayLogs, setTodayLogs] = useState<NutritionLog[]>([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadLogs(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadLogs = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: true })
    setTodayLogs(data || [])
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const submitNutrition = async () => {
    if (!user || !mealType || score === 0) return
    await supabase.from('nutrition_logs').insert({
      user_id: user.id,
      date,
      meal_type: mealType,
      tags: selectedTags,
      hydration,
      score,
      note: note || null,
    })
    setMealType('')
    setSelectedTags([])
    setHydration(false)
    setScore(0)
    setNote('')
    loadLogs(user.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-sm text-gray-500 underline">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Nutrition</h1>
      </div>

      {/* Nutrition input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enregistrer un repas</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Meal type */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Repas</label>
            <div className="grid grid-cols-2 gap-2">
              {mealTypes.map((meal) => (
                <button
                  key={meal.value}
                  onClick={() => setMealType(meal.value)}
                  className={`p-2 border rounded-lg text-sm transition ${
                    mealType === meal.value ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                >
                  {meal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs border transition ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Hydration */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hydration"
              checked={hydration}
              onChange={(e) => setHydration(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="hydration" className="text-sm text-gray-600">
              💧 Bien hydraté
            </label>
          </div>

          {/* Score */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Score global</label>
            <div className="flex justify-between">
              {scores.map((s) => (
                <button
                  key={s.score}
                  onClick={() => setScore(s.score)}
                  className={`flex flex-col items-center p-2 rounded-lg transition ${
                    score === s.score ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-xs text-gray-500 mt-1">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <input
            type="text"
            placeholder="Une note ? (optionnel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-2 border rounded text-sm"
          />

          <button
            onClick={submitNutrition}
            disabled={!mealType || score === 0}
            className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-300"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Today's logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
        {todayLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucun repas enregistré</p>
        ) : (
          <div className="space-y-3">
            {todayLogs.map((log) => (
              <div key={log.id} className="border-b pb-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {mealTypes.find((m) => m.value === log.meal_type)?.label}
                  </span>
                  <span className="text-lg">
                    {scores.find((s) => s.score === log.score)?.emoji}
                  </span>
                </div>
                {log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {log.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {log.hydration && <span className="text-xs text-blue-500">💧 Hydraté</span>}
                {log.note && <p className="text-xs text-gray-500 mt-1">{log.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
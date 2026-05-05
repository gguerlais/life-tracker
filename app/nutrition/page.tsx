'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

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

  const deleteNutrition = async (id: string) => {
    await supabase.from('nutrition_logs').delete().eq('id', id)
    if (user) loadLogs(user.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🥗 Nutrition</h1>

        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-5">Enregistrer un repas</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
            </div>

            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Repas</label>
              <div className="grid grid-cols-2 gap-2">
                {mealTypes.map((meal) => (
                  <motion.button
                    key={meal.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMealType(meal.value)}
                    className={`p-3 rounded-xl text-sm transition-all duration-200 ${
                      mealType === meal.value
                        ? 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {meal.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Tags</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? 'bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] ring-1 ring-[var(--accent-orange)]/50'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setHydration(!hydration)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                  hydration
                    ? 'bg-[var(--accent-blue)]/20 ring-1 ring-[var(--accent-blue)]'
                    : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                💧 Bien hydraté
              </button>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Score global</label>
              <div className="flex justify-between">
                {scores.map((s) => (
                  <motion.button
                    key={s.score}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setScore(s.score)}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-200 ${
                      score === s.score
                        ? 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)]'
                        : 'hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-1">{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Une note ? (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-xl text-sm"
            />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={submitNutrition}
              disabled={!mealType || score === 0}
              className="w-full bg-[var(--accent-orange)] text-black font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Enregistrer
            </motion.button>
          </div>
        </Card>

        <Card delay={0.1}>
          <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
          {todayLogs.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucun repas enregistré</p>
          ) : (
            <div className="space-y-3">
              {todayLogs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">
                      {mealTypes.find((m) => m.value === log.meal_type)?.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{scores.find((s) => s.score === log.score)?.emoji}</span>
                      <button onClick={() => deleteNutrition(log.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                    </div>
                  </div>
                  {log.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {log.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-[10px] text-[var(--text-tertiary)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {log.hydration && <span className="text-xs text-[var(--accent-blue)]">💧 Hydraté</span>}
                  {log.note && <p className="text-xs text-[var(--text-tertiary)] mt-1">{log.note}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
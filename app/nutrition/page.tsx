'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

// ─── CONSTANTS ───

const mealTypes = [
  { value: 'petit-dej', label: '🌅 Petit-déj' },
  { value: 'dejeuner', label: '☀️ Déjeuner' },
  { value: 'gouter', label: '🍪 Goûter' },
  { value: 'diner', label: '🌙 Dîner' },
  { value: 'snack', label: '🍎 Snack' },
]

const quantities = [
  { value: 'pas_mange', label: 'Pas mangé', emoji: '❌' },
  { value: 'manque', label: 'Manque', emoji: '😕' },
  { value: 'rassasie', label: 'Rassasié', emoji: '😊' },
  { value: 'trop_mange', label: 'Trop mangé', emoji: '🫠' },
]

const qualities = [
  { value: 'trop_gras', label: 'Trop gras', emoji: '🍟' },
  { value: 'trop_sucre', label: 'Trop sucré', emoji: '🍬' },
  { value: 'equilibre', label: 'Équilibré', emoji: '🥗' },
]

const mealSources = [
  { value: 'fait_maison', label: 'Fait maison', emoji: '🏠' },
  { value: 'dehors', label: 'Mangé dehors', emoji: '🍽️' },
]

type NutritionLog = {
  id: string
  date: string
  meal_type: string
  quantity: string | null
  protein_focus: boolean
  quality: string | null
  meal_source: string | null
  hydration: boolean
  note: string | null
  created_at: string
}

// ─── COMPONENT ───

export default function NutritionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [proteinFocus, setProteinFocus] = useState(false)
  const [quality, setQuality] = useState('')
  const [mealSource, setMealSource] = useState('')
  const [hydration, setHydration] = useState(false)
  const [note, setNote] = useState('')
  const [todayLogs, setTodayLogs] = useState<NutritionLog[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
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

  const resetForm = () => {
    setMealType('')
    setQuantity('')
    setProteinFocus(false)
    setQuality('')
    setMealSource('')
    setHydration(false)
    setNote('')
    setEditingId(null)
  }

  const startEditing = (log: NutritionLog) => {
    setEditingId(log.id)
    setMealType(log.meal_type)
    setQuantity(log.quantity || '')
    setProteinFocus(log.protein_focus)
    setQuality(log.quality || '')
    setMealSource(log.meal_source || '')
    setHydration(log.hydration)
    setNote(log.note || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitNutrition = async () => {
    if (!user || !mealType) return

    const payload = {
      user_id: user.id,
      date,
      meal_type: mealType,
      quantity: quantity || null,
      protein_focus: proteinFocus,
      quality: quality || null,
      meal_source: mealSource || null,
      hydration,
      note: note || null,
    }

    if (editingId) {
      await supabase.from('nutrition_logs').update(payload).eq('id', editingId)
    } else {
      await supabase.from('nutrition_logs').insert(payload)
    }

    resetForm()
    loadLogs(user.id)
  }

  const deleteNutrition = async (id: string) => {
    await supabase.from('nutrition_logs').delete().eq('id', id)
    if (user) loadLogs(user.id)
  }

  // ─── RENDER ───

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🥗 Nutrition</h1>

        <Card className="mb-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold">{editingId ? 'Modifier le repas' : 'Enregistrer un repas'}</h2>
            {editingId && (
              <button onClick={resetForm} className="text-xs text-[var(--text-tertiary)] hover:underline">Annuler</button>
            )}
          </div>
          <div className="space-y-5">

            {/* Date */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
            </div>

            {/* Meal type */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Repas</label>
              <div className="flex flex-wrap gap-2">
                {mealTypes.map((meal) => (
                  <motion.button key={meal.value} whileTap={{ scale: 0.95 }}
                    onClick={() => setMealType(meal.value)}
                    className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                      mealType === meal.value
                        ? 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >{meal.label}</motion.button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Quantité</label>
              <div className="grid grid-cols-4 gap-2">
                {quantities.map((q) => (
                  <motion.button key={q.value} whileTap={{ scale: 0.95 }}
                    onClick={() => setQuantity(quantity === q.value ? '' : q.value)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
                      quantity === q.value
                        ? 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <span className="text-lg">{q.emoji}</span>
                    <span className="text-[9px] text-[var(--text-tertiary)] mt-1 text-center leading-tight">{q.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Protein focus */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Protéines</label>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => setProteinFocus(!proteinFocus)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  proteinFocus
                    ? 'bg-[var(--accent-red)]/20 ring-1 ring-[var(--accent-red)] text-[var(--accent-red)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >🥩 Protéines-focus</motion.button>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Équilibre</label>
              <div className="grid grid-cols-3 gap-2">
                {qualities.map((q) => (
                  <motion.button key={q.value} whileTap={{ scale: 0.95 }}
                    onClick={() => setQuality(quality === q.value ? '' : q.value)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
                      quality === q.value
                        ? q.value === 'equilibre'
                          ? 'bg-[var(--accent-green)]/20 ring-1 ring-[var(--accent-green)]'
                          : 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <span className="text-lg">{q.emoji}</span>
                    <span className="text-[9px] text-[var(--text-tertiary)] mt-1 text-center leading-tight">{q.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Meal source */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Provenance</label>
              <div className="grid grid-cols-2 gap-2">
                {mealSources.map((s) => (
                  <motion.button key={s.value} whileTap={{ scale: 0.95 }}
                    onClick={() => setMealSource(mealSource === s.value ? '' : s.value)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-sm transition-all duration-200 ${
                      mealSource === s.value
                        ? 'bg-[var(--accent-purple)]/20 ring-1 ring-[var(--accent-purple)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  ><span>{s.emoji}</span><span className="text-xs">{s.label}</span></motion.button>
                ))}
              </div>
            </div>

            {/* Hydration */}
            <div>
              <motion.button whileTap={{ scale: 0.95 }}
                onClick={() => setHydration(!hydration)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  hydration
                    ? 'bg-[var(--accent-blue)]/20 ring-1 ring-[var(--accent-blue)] text-[var(--accent-blue)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                }`}
              >💧 Bien hydraté</motion.button>
            </div>

            {/* Note */}
            <input type="text" placeholder="Une note ? (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 rounded-xl text-sm" />

            {/* Submit */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={submitNutrition} disabled={!mealType}
              className="w-full bg-[var(--accent-orange)] text-black font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >{editingId ? 'Modifier le repas' : 'Enregistrer'}</motion.button>
          </div>
        </Card>

        {/* ─── TODAY ─── */}
        <Card delay={0.1}>
          <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
          {todayLogs.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucun repas enregistré</p>
          ) : (
            <div className="space-y-3">
              {todayLogs.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">
                      {mealTypes.find((m) => m.value === log.meal_type)?.label}
                    </span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEditing(log)} className="text-[var(--accent-purple)] text-xs hover:underline">✏️</button>
                      <button onClick={() => deleteNutrition(log.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {log.quantity && (
                      <span className="px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-[10px] text-[var(--text-tertiary)]">
                        {quantities.find((q) => q.value === log.quantity)?.emoji} {quantities.find((q) => q.value === log.quantity)?.label}
                      </span>
                    )}
                    {log.protein_focus && (
                      <span className="px-2 py-0.5 bg-[var(--accent-red)]/10 rounded-full text-[10px] text-[var(--accent-red)]">
                        🥩 Protéines
                      </span>
                    )}
                    {log.quality && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        log.quality === 'equilibre'
                          ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                          : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                      }`}>
                        {qualities.find((q) => q.value === log.quality)?.emoji} {qualities.find((q) => q.value === log.quality)?.label}
                      </span>
                    )}
                    {log.meal_source && (
                      <span className="px-2 py-0.5 bg-[var(--accent-purple)]/10 rounded-full text-[10px] text-[var(--accent-purple)]">
                        {mealSources.find((s) => s.value === log.meal_source)?.emoji} {mealSources.find((s) => s.value === log.meal_source)?.label}
                      </span>
                    )}
                    {log.hydration && (
                      <span className="px-2 py-0.5 bg-[var(--accent-blue)]/10 rounded-full text-[10px] text-[var(--accent-blue)]">
                        💧 Hydraté
                      </span>
                    )}
                  </div>

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
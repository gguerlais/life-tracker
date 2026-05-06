'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import PageTransition from '../../components/PageTransition'
import Card from '../../components/Card'
import BodyMap from '../../components/BodyMap'
import { motion } from 'framer-motion'

// ─── TYPES ───

type SessionRow = {
  id: string
  date: string
  type: string
  duration_min: number | null
}

type ExerciseSetRow = {
  exercise_id: string
  reps: number | null
  weight_kg: number | null
  duration_min: number | null
  rpe: number | null
  equipment_type: string | null
  is_unilateral: boolean
  exercises_library: { name: string; category: string; muscle_group: string } | null
  sport_sessions: { date: string; user_id: string } | null
}

type RecordEntry = {
  weight: number
  reps: number
  date: string
}

type VariantRecords = {
  label: string
  rm1: RecordEntry | null
  rm3: RecordEntry | null
  rm5: RecordEntry | null
  rm12: RecordEntry | null
}

// ─── CONSTANTS ───

const tooltipStyle = {
  backgroundColor: '#1c1c1e',
  border: '1px solid #2c2c2e',
  borderRadius: '12px',
  padding: '8px 12px',
  color: '#f5f5f7',
  fontSize: '12px',
}

const equipLabels: Record<string, string> = {
  barre: 'Barre', kb_db: 'KB/DB', machine: 'Machine', poids_du_corps: 'PDC',
}

// ─── COMPONENT ───

function SportAnalyticsContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [period, setPeriod] = useState(parseInt(searchParams.get('period') || '7'))

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [chartData, setChartData] = useState<{ date: string; Muscu: number; Cardio: number; Mobilité: number; Mixte: number }[]>([])
  const [totalWeight, setTotalWeight] = useState(0)
  const [cardioMinutes, setCardioMinutes] = useState(0)
  const [muscleVolumes, setMuscleVolumes] = useState<Record<string, number>>({})

  // Hall of Fame
  const [allSets, setAllSets] = useState<ExerciseSetRow[]>([])
  const [doneExercises, setDoneExercises] = useState<{ id: string; name: string }[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [variantRecords, setVariantRecords] = useState<VariantRecords[]>([])

  const router = useRouter()

  // ─── LOAD ───

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadPeriodData(user.id, period)
        loadAllTimeSets(user.id)
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

  const loadPeriodData = async (userId: string, days: number) => {
    const startDate = getStartDate(days)

    // Sessions
    const { data: sessionData } = await supabase
      .from('sport_sessions')
      .select('id, date, type, duration_min')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date')
    setSessions(sessionData || [])

    // Chart data
    if (sessionData) {
      const dates = [...new Set(sessionData.map((s) => s.date))].sort()
      setChartData(dates.map((date) => ({
        date: formatDate(date),
        Muscu: sessionData.filter((s) => s.date === date && s.type === 'Muscu').length,
        Cardio: sessionData.filter((s) => s.date === date && s.type === 'Cardio').length,
        Mobilité: sessionData.filter((s) => s.date === date && s.type === 'Mobilité').length,
        Mixte: sessionData.filter((s) => s.date === date && s.type === 'Mixte').length,
      })))
    }

    // Exercises for weight + cardio + muscle volumes
    const { data: exData } = await supabase
      .from('sport_session_exercises')
      .select('reps, weight_kg, duration_min, exercises_library ( category, muscle_group ), sport_sessions!inner ( user_id, date )')
      .eq('sport_sessions.user_id', userId)
      .gte('sport_sessions.date', startDate)

    if (exData) {
      let weight = 0
      let cardio = 0
      const volumes: Record<string, number> = {}

      for (const ex of exData as unknown as ExerciseSetRow[]) {
        const cat = ex.exercises_library?.category
        const group = ex.exercises_library?.muscle_group

        if (ex.weight_kg && ex.reps) {
          weight += ex.weight_kg * ex.reps
        }
        if (cat === 'cardio' && ex.duration_min) {
          cardio += ex.duration_min
        }
        if (group && group !== 'Cardio' && group !== 'Mobilité') {
          volumes[group] = (volumes[group] || 0) + 1
        }
      }

      setTotalWeight(Math.round(weight))
      setCardioMinutes(cardio)
      setMuscleVolumes(volumes)
    }
  }

  const loadAllTimeSets = async (userId: string) => {
    const { data } = await supabase
      .from('sport_session_exercises')
      .select('exercise_id, reps, weight_kg, duration_min, rpe, equipment_type, is_unilateral, exercises_library ( name, category, muscle_group ), sport_sessions!inner ( user_id, date )')
      .eq('sport_sessions.user_id', userId)

    if (data) {
      const sets = data as unknown as ExerciseSetRow[]
      setAllSets(sets)

      const exerciseMap = new Map<string, string>()
      for (const s of sets) {
        if (s.exercises_library?.category === 'muscu' && s.weight_kg && s.reps && s.exercises_library?.name) {
          exerciseMap.set(s.exercise_id, s.exercises_library.name)
        }
      }
      setDoneExercises(
        [...exerciseMap.entries()]
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      )
    }
  }

  // ─── HALL OF FAME ───

  useEffect(() => {
    if (!selectedExercise || allSets.length === 0) { setVariantRecords([]); return }

    const sets = allSets.filter((s) => s.exercise_id === selectedExercise && s.weight_kg && s.reps)

    // Grouper par variante (equipment + unilateral)
    const variants = new Map<string, ExerciseSetRow[]>()
    for (const s of sets) {
      const equip = s.equipment_type || 'autre'
      const uni = s.is_unilateral ? 'uni' : 'bi'
      const key = `${equip}_${uni}`
      if (!variants.has(key)) variants.set(key, [])
      variants.get(key)!.push(s)
    }

    const results: VariantRecords[] = []
    for (const [key, variantSets] of variants) {
      const [equip, uni] = key.split('_')
      const parts = []
      if (equipLabels[equip]) parts.push(equipLabels[equip])
      if (uni === 'uni') parts.push('Unilatéral')
      const label = parts.length > 0 ? parts.join(' · ') : 'Standard'

      const findRM = (minReps: number): RecordEntry | null => {
        const eligible = variantSets.filter((s) => (s.reps || 0) >= minReps)
        if (eligible.length === 0) return null
        const best = eligible.reduce((max, s) => (s.weight_kg || 0) > (max.weight_kg || 0) ? s : max)
        return {
          weight: best.weight_kg || 0,
          reps: best.reps || 0,
          date: (best.sport_sessions as unknown as { date: string })?.date || '',
        }
      }

      results.push({ label, rm1: findRM(1), rm3: findRM(3), rm5: findRM(5), rm12: findRM(12) })
    }

    results.sort((a, b) => (b.rm1?.weight || 0) - (a.rm1?.weight || 0))
    setVariantRecords(results)
  }, [selectedExercise, allSets])

  // ─── HELPERS ───

  const formatWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}T`
    return `${kg}kg`
  }

  // ─── RENDER ───

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/analytics')} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-xl">←</button>
          <h1 className="text-3xl font-bold">🏋️ Sport</h1>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-8">
          {[7, 14, 30].map((d) => (
            <motion.button key={d} whileTap={{ scale: 0.95 }} onClick={() => setPeriod(d)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                period === d ? 'bg-[var(--accent-red)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
              }`}
            >{d}j</motion.button>
          ))}
        </div>

        {/* KPIs */}
        <Card className="mb-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-red)]">{sessions.length}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">séances</p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-orange)]">{formatWeight(totalWeight)}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">soulevés</p>
            </div>
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[var(--accent-blue)]">{cardioMinutes}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">min cardio</p>
            </div>
          </div>
        </Card>

        {/* Body Map */}
        <Card className="mb-5" delay={0.05}>
          <h2 className="text-base font-semibold mb-1">Volume par muscle</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Nombre de séries sur la période</p>

          <BodyMap volumes={muscleVolumes} />

          {/* Legend */}
          <div className="mt-4 space-y-1">
            {Object.entries(muscleVolumes)
              .sort(([, a], [, b]) => b - a)
              .map(([group, volume]) => (
                <div key={group} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">{group}</span>
                  <span className="text-[var(--text-tertiary)]">
                    {volume} {volume > 1 ? 'séries' : 'série'}
                  </span>
                </div>
              ))}
          </div>

          {Object.keys(muscleVolumes).length === 0 && (
            <p className="text-[var(--text-tertiary)] text-sm text-center mt-2">Pas de données</p>
          )}

          {/* Color scale */}
          <div className="flex items-center justify-center gap-2 mt-4 text-[9px] text-[var(--text-tertiary)]">
            <span>Faible</span>
            <div className="flex gap-0.5">
              {['#1a3a2e', '#1b6b3a', '#30d158', '#ff9f0a', '#ff6b35', '#ff453a'].map((color) => (
                <div key={color} className="w-4 h-3 rounded-sm" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span>Élevé</span>
          </div>
        </Card>

        {/* Sessions chart */}
        <Card className="mb-5" delay={0.1}>
          <h2 className="text-base font-semibold mb-1">Séances par type</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Répartition sur la période</p>
          {chartData.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Pas de données</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6e6e73' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Muscu" stackId="a" fill="#ff453a" />
                <Bar dataKey="Cardio" stackId="a" fill="#64d2ff" />
                <Bar dataKey="Mobilité" stackId="a" fill="#30d158" />
                <Bar dataKey="Mixte" stackId="a" fill="#ff9f0a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Hall of Fame */}
        <Card className="mb-5" delay={0.2}>
          <h2 className="text-base font-semibold mb-1">🏆 Hall of Fame</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Records personnels par variante (tous temps)</p>

          <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="w-full p-3 rounded-xl text-sm mb-4">
            <option value="">-- Sélectionner un exercice --</option>
            {doneExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>

          {variantRecords.length > 0 && (
            <div className="space-y-5">
              {variantRecords.map((variant, vi) => (
                <motion.div key={vi} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: vi * 0.1 }}>
                  <p className="text-xs font-semibold text-[var(--accent-purple)] mb-2">{variant.label}</p>
                  <div className="space-y-2">
                    {[
                      { label: '1RM', data: variant.rm1, emoji: '🥇' },
                      { label: '3RM', data: variant.rm3, emoji: '🥈' },
                      { label: '5RM', data: variant.rm5, emoji: '🥉' },
                      { label: '12RM', data: variant.rm12, emoji: '📊' },
                    ].map((rm) => (
                      rm.data && (
                        <div key={rm.label} className="flex items-center justify-between bg-[var(--bg-secondary)] p-3 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{rm.emoji}</span>
                            <span className="text-sm font-medium">{rm.label}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-bold">{rm.data.weight}kg</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] ml-2">
                              {rm.data.reps}r · {new Date(rm.data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedExercise && variantRecords.length === 0 && (
            <p className="text-[var(--text-tertiary)] text-sm text-center">Aucune donnée pour cet exercice</p>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}

export default function SportAnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <SportAnalyticsContent />
    </Suspense>
  )
}
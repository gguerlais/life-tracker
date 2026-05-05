'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

type Exercise = {
  id: string
  name: string
  muscle_group: string
  category: string
}

type SetEntry = {
  reps: string
  weight_kg: string
  duration_min: string
}

type SessionExerciseBlock = {
  exercise_id: string
  exercise_name: string
  sets: SetEntry[]
}

type SportSession = {
  id: string
  date: string
  type: string
  duration_min: number | null
  notes: string | null
  sport_session_exercises: {
    id: string
    set_number: number
    reps: number | null
    weight_kg: number | null
    duration_min: number | null
    exercises_library: { name: string } | null
  }[]
}

const sessionTypes = ['Muscu', 'Cardio', 'Mobilité', 'Mixte']

export default function SportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<SportSession[]>([])

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionType, setSessionType] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseBlock[]>([])

  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState('')

  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customGroup, setCustomGroup] = useState('')
  const [customCategory, setCustomCategory] = useState('muscu')

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadExercises()
        loadSessions(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadExercises = async () => {
    const { data } = await supabase.from('exercises_library').select('*').order('muscle_group').order('name')
    setExercises(data || [])
  }

  const loadSessions = async (userId: string) => {
    const { data } = await supabase
      .from('sport_sessions')
      .select('*, sport_session_exercises ( id, set_number, reps, weight_kg, duration_min, exercises_library ( name ) )')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    setSessions(data || [])
  }

  const muscleGroups = [...new Set(exercises.map((e) => e.muscle_group))].sort((a, b) => a.localeCompare(b, 'fr'))
  const filteredExercises = exercises.filter((e) => e.muscle_group === selectedGroup).sort((a, b) => a.name.localeCompare(b.name, 'fr'))


  const addExerciseBlock = () => {
    const exercise = exercises.find((e) => e.id === selectedExerciseId)
    if (!exercise) return
    setSessionExercises([...sessionExercises, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: [{ reps: '', weight_kg: '', duration_min: '' }],
    }])
    setSelectedExerciseId('')
    setSelectedGroup('')
  }

  const addSet = (exIndex: number) => {
    const updated = [...sessionExercises]
    const lastSet = updated[exIndex].sets[updated[exIndex].sets.length - 1]
    updated[exIndex].sets.push({ reps: lastSet.reps, weight_kg: lastSet.weight_kg, duration_min: lastSet.duration_min })
    setSessionExercises(updated)
  }

  const removeSet = (exIndex: number, setIndex: number) => {
    const updated = [...sessionExercises]
    updated[exIndex].sets.splice(setIndex, 1)
    if (updated[exIndex].sets.length === 0) updated.splice(exIndex, 1)
    setSessionExercises(updated)
  }

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetEntry, value: string) => {
    const updated = [...sessionExercises]
    updated[exIndex].sets[setIndex][field] = value
    setSessionExercises(updated)
  }

  const removeExerciseBlock = (exIndex: number) => {
    setSessionExercises(sessionExercises.filter((_, i) => i !== exIndex))
  }

  const addCustomExercise = async () => {
    if (!user || !customName || !customGroup) return
    const { data } = await supabase
      .from('exercises_library')
      .insert({ name: customName, muscle_group: customGroup, category: customCategory, is_custom: true, user_id: user.id })
      .select().single()
    if (data) {
      setExercises([...exercises, data])
      setCustomName('')
      setCustomGroup('')
      setShowCustom(false)
    }
  }

  const submitSession = async () => {
    if (!user || !sessionType) return
    const { data: session } = await supabase
      .from('sport_sessions')
      .insert({ user_id: user.id, date, type: sessionType, duration_min: durationMin ? parseInt(durationMin) : null, notes: sessionNotes || null })
      .select().single()

    if (session && sessionExercises.length > 0) {
      const rows = sessionExercises.flatMap((ex) =>
        ex.sets.map((set, i) => ({
          session_id: session.id, exercise_id: ex.exercise_id, set_number: i + 1,
          reps: set.reps ? parseInt(set.reps) : null,
          weight_kg: set.weight_kg ? parseFloat(set.weight_kg) : null,
          duration_min: set.duration_min ? parseInt(set.duration_min) : null,
        }))
      )
      await supabase.from('sport_session_exercises').insert(rows)
    }

    setSessionType('')
    setDurationMin('')
    setSessionNotes('')
    setSessionExercises([])
    loadSessions(user.id)
  }

  const deleteSession = async (id: string) => {
    // Les exercices sont supprimés automatiquement grâce à ON DELETE CASCADE
    await supabase.from('sport_sessions').delete().eq('id', id)
    if (user) loadSessions(user.id)
  }

  const groupSessionExercises = (session: SportSession) => {
    const groups: Record<string, { name: string; sets: typeof session.sport_session_exercises }> = {}
    for (const ex of session.sport_session_exercises) {
      const name = ex.exercises_library?.name || 'Inconnu'
      if (!groups[name]) groups[name] = { name, sets: [] }
      groups[name].sets.push(ex)
    }
    return Object.values(groups)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🏋️ Sport</h1>

        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-5">Nouvelle séance</h2>
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Durée (min)</label>
                <input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="60" className="w-full p-3 rounded-xl text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Type</label>
              <div className="flex gap-2">
                {sessionTypes.map((t) => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSessionType(t)
                      if (t === 'Cardio') setSelectedGroup('Cardio')
                      else if (t === 'Mobilité') setSelectedGroup('Mobilité')
                      else setSelectedGroup('')
                    }}
                    className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${
                      sessionType === t
                        ? 'bg-[var(--accent-red)]/20 ring-1 ring-[var(--accent-red)]'
                        : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-5">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs text-[var(--text-tertiary)] ml-1">Exercices</label>
                <button onClick={() => setShowCustom(!showCustom)} className="text-xs text-[var(--accent-purple)] hover:underline">
                  {showCustom ? 'Annuler' : '+ Custom'}
                </button>
              </div>

              {showCustom && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl mb-4 space-y-3"
                >
                  <input type="text" placeholder="Nom de l'exercice" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                  <input type="text" placeholder="Groupe musculaire" value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                  <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full p-3 rounded-xl text-sm">
                    <option value="muscu">Muscu</option>
                    <option value="cardio">Cardio</option>
                    <option value="mobilite">Mobilité</option>
                    <option value="autre">Autre</option>
                  </select>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={addCustomExercise} className="w-full bg-[var(--accent-purple)] text-white p-3 rounded-xl text-sm font-medium">
                    Ajouter à la bibliothèque
                  </motion.button>
                </motion.div>
              )}

              <div className="space-y-3 mb-4">
                <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setSelectedExerciseId('') }} className="w-full p-3 rounded-xl text-sm">
                  <option value="">-- Groupe musculaire --</option>
                  {muscleGroups.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>

                {selectedGroup && (
                  <div className="flex gap-2">
                    <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} className="flex-1 p-3 rounded-xl text-sm">
                      <option value="">-- Exercice --</option>
                      {filteredExercises.map((ex) => (<option key={ex.id} value={ex.id}>{ex.name}</option>))}
                    </select>
                    {selectedExerciseId && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={addExerciseBlock} className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] px-4 rounded-xl text-sm font-medium">
                        +
                      </motion.button>
                    )}
                  </div>
                )}
              </div>

              {sessionExercises.map((block, exIndex) => (
                <motion.div
                  key={exIndex}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-3"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-sm">{block.exercise_name}</span>
                    <button onClick={() => removeExerciseBlock(exIndex)} className="text-[var(--accent-red)] text-xs hover:underline">Supprimer</button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-2 text-[10px] text-[var(--text-tertiary)] px-1">
                    <span>Série</span><span>Reps</span><span>Kg</span><span>Min</span>
                  </div>

                  {block.sets.map((set, setIndex) => (
                    <div key={setIndex} className="grid grid-cols-4 gap-2 mb-2 items-center">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[var(--text-tertiary)] w-4">{setIndex + 1}</span>
                        <button onClick={() => removeSet(exIndex, setIndex)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs">✕</button>
                      </div>
                      <input type="number" placeholder="—" value={set.reps} onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
                      <input type="number" placeholder="—" value={set.weight_kg} onChange={(e) => updateSet(exIndex, setIndex, 'weight_kg', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
                      <input type="number" placeholder="—" value={set.duration_min} onChange={(e) => updateSet(exIndex, setIndex, 'duration_min', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
                    </div>
                  ))}

                  <button onClick={() => addSet(exIndex)} className="text-xs text-[var(--accent-purple)] mt-1 hover:underline">
                    + Ajouter une série
                  </button>
                </motion.div>
              ))}
            </div>

            <input type="text" placeholder="Notes (optionnel)" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} className="w-full p-3 rounded-xl text-sm" />

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={submitSession}
              disabled={!sessionType}
              className="w-full bg-[var(--accent-red)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Enregistrer la séance
            </motion.button>
          </div>
        </Card>

        <Card delay={0.1}>
          <h2 className="text-lg font-semibold mb-4">Dernières séances</h2>
          {sessions.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucune séance enregistrée</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">
                      {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{session.type}
                    </span>
                    <div className="flex items-center gap-3">
                      {session.duration_min && <span className="text-[var(--text-tertiary)] text-xs">{session.duration_min} min</span>}
                      <button onClick={() => deleteSession(session.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                    </div>
                  </div>
                  {groupSessionExercises(session).map((group, gi) => (
                    <div key={gi} className="ml-2 mb-2">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{group.name}</span>
                      <div className="ml-2">
                        {group.sets.sort((a, b) => a.set_number - b.set_number).map((set) => (
                          <div key={set.id} className="text-[11px] text-[var(--text-tertiary)]">
                            S{set.set_number} : {[set.reps && `${set.reps} reps`, set.weight_kg && `${set.weight_kg}kg`, set.duration_min && `${set.duration_min}min`].filter(Boolean).join(' · ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {session.notes && <p className="text-xs text-[var(--text-tertiary)] mt-1">{session.notes}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
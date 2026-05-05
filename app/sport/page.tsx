'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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

  // Form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionType, setSessionType] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionExercises, setSessionExercises] = useState<SessionExerciseBlock[]>([])

  // Select exercise
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState('')

  // Custom exercise
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
    const { data } = await supabase
      .from('exercises_library')
      .select('*')
      .order('muscle_group')
      .order('name')
    setExercises(data || [])
  }

  const loadSessions = async (userId: string) => {
    const { data } = await supabase
      .from('sport_sessions')
      .select(`
        *,
        sport_session_exercises (
          id, set_number, reps, weight_kg, duration_min,
          exercises_library ( name )
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    setSessions(data || [])
  }

  const muscleGroups = [...new Set(exercises.map((e) => e.muscle_group))]
  const filteredExercises = exercises.filter((e) => e.muscle_group === selectedGroup)

  // Ajouter un exercice au bloc avec 1 série par défaut
  const addExerciseBlock = () => {
    const exercise = exercises.find((e) => e.id === selectedExerciseId)
    if (!exercise) return
    setSessionExercises([
      ...sessionExercises,
      {
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        sets: [{ reps: '', weight_kg: '', duration_min: '' }],
      },
    ])
    setSelectedExerciseId('')
    setSelectedGroup('')
  }

  // Ajouter une série à un exercice
  const addSet = (exIndex: number) => {
    const updated = [...sessionExercises]
    const lastSet = updated[exIndex].sets[updated[exIndex].sets.length - 1]
    // Pré-remplir avec les valeurs de la série précédente
    updated[exIndex].sets.push({
      reps: lastSet.reps,
      weight_kg: lastSet.weight_kg,
      duration_min: lastSet.duration_min,
    })
    setSessionExercises(updated)
  }

  // Supprimer une série
  const removeSet = (exIndex: number, setIndex: number) => {
    const updated = [...sessionExercises]
    updated[exIndex].sets.splice(setIndex, 1)
    if (updated[exIndex].sets.length === 0) {
      updated.splice(exIndex, 1)
    }
    setSessionExercises(updated)
  }

  // Modifier une série
  const updateSet = (exIndex: number, setIndex: number, field: keyof SetEntry, value: string) => {
    const updated = [...sessionExercises]
    updated[exIndex].sets[setIndex][field] = value
    setSessionExercises(updated)
  }

  // Supprimer un exercice entier
  const removeExerciseBlock = (exIndex: number) => {
    setSessionExercises(sessionExercises.filter((_, i) => i !== exIndex))
  }

  const addCustomExercise = async () => {
    if (!user || !customName || !customGroup) return
    const { data } = await supabase
      .from('exercises_library')
      .insert({
        name: customName,
        muscle_group: customGroup,
        category: customCategory,
        is_custom: true,
        user_id: user.id,
      })
      .select()
      .single()
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
      .insert({
        user_id: user.id,
        date,
        type: sessionType,
        duration_min: durationMin ? parseInt(durationMin) : null,
        notes: sessionNotes || null,
      })
      .select()
      .single()

    if (session && sessionExercises.length > 0) {
      const rows = sessionExercises.flatMap((ex) =>
        ex.sets.map((set, i) => ({
          session_id: session.id,
          exercise_id: ex.exercise_id,
          set_number: i + 1,
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

  // Grouper les exercices d'une session pour l'affichage
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
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-sm text-gray-500 underline">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Sport</h1>
      </div>

      {/* New session */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Nouvelle séance</h2>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Durée (min)</label>
              <input type="number" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="60" className="w-full p-2 border rounded" />
            </div>
          </div>

          {/* Session type */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Type</label>
            <div className="flex gap-2">
              {sessionTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSessionType(t)}
                  className={`px-3 py-1 border rounded-lg text-sm transition ${
                    sessionType === t ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-gray-600">Exercices</label>
              <button onClick={() => setShowCustom(!showCustom)} className="text-xs text-blue-500 underline">
                {showCustom ? 'Annuler' : '+ Exercice custom'}
              </button>
            </div>

            {/* Custom exercise form */}
            {showCustom && (
              <div className="bg-gray-50 p-3 rounded mb-3 space-y-2">
                <input type="text" placeholder="Nom de l'exercice" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full p-2 border rounded text-sm" />
                <input type="text" placeholder="Groupe musculaire" value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} className="w-full p-2 border rounded text-sm" />
                <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full p-2 border rounded text-sm">
                  <option value="muscu">Muscu</option>
                  <option value="cardio">Cardio</option>
                  <option value="mobilite">Mobilité</option>
                  <option value="autre">Autre</option>
                </select>
                <button onClick={addCustomExercise} className="w-full bg-gray-800 text-white p-2 rounded text-sm">Ajouter à la bibliothèque</button>
              </div>
            )}

            {/* Select exercise */}
            <div className="space-y-2 mb-3">
              <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setSelectedExerciseId('') }} className="w-full p-2 border rounded text-sm">
                <option value="">-- Groupe musculaire --</option>
                {muscleGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {selectedGroup && (
                <div className="flex gap-2">
                  <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} className="flex-1 p-2 border rounded text-sm">
                    <option value="">-- Exercice --</option>
                    {filteredExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                  {selectedExerciseId && (
                    <button onClick={addExerciseBlock} className="bg-gray-200 px-3 rounded text-sm hover:bg-gray-300">
                      + Ajouter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Exercise blocks with sets */}
            {sessionExercises.map((block, exIndex) => (
              <div key={exIndex} className="bg-gray-50 rounded p-3 mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm">{block.exercise_name}</span>
                  <button onClick={() => removeExerciseBlock(exIndex)} className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-4 gap-2 mb-1 text-xs text-gray-400 px-1">
                  <span>Série</span>
                  <span>Reps</span>
                  <span>Kg</span>
                  <span>Min</span>
                </div>

                {/* Sets */}
                {block.sets.map((set, setIndex) => (
                  <div key={setIndex} className="grid grid-cols-4 gap-2 mb-1 items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 w-4">{setIndex + 1}</span>
                      <button onClick={() => removeSet(exIndex, setIndex)} className="text-red-300 hover:text-red-500 text-xs">✕</button>
                    </div>
                    <input
                      type="number"
                      placeholder="—"
                      value={set.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                      className="p-1 border rounded text-sm text-center"
                    />
                    <input
                      type="number"
                      placeholder="—"
                      value={set.weight_kg}
                      onChange={(e) => updateSet(exIndex, setIndex, 'weight_kg', e.target.value)}
                      className="p-1 border rounded text-sm text-center"
                    />
                    <input
                      type="number"
                      placeholder="—"
                      value={set.duration_min}
                      onChange={(e) => updateSet(exIndex, setIndex, 'duration_min', e.target.value)}
                      className="p-1 border rounded text-sm text-center"
                    />
                  </div>
                ))}

                <button onClick={() => addSet(exIndex)} className="text-xs text-blue-500 mt-1 underline">
                  + Ajouter une série
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <input type="text" placeholder="Notes (optionnel)" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} className="w-full p-2 border rounded text-sm" />

          <button
            onClick={submitSession}
            disabled={!sessionType}
            className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-300"
          >
            Enregistrer la séance
          </button>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Dernières séances</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune séance enregistrée</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border-b pb-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">
                    {new Date(session.date).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                    {' · '}{session.type}
                  </span>
                  {session.duration_min && (
                    <span className="text-gray-500">{session.duration_min} min</span>
                  )}
                </div>
                {groupSessionExercises(session).map((group, i) => (
                  <div key={i} className="ml-2 mb-2">
                    <span className="text-xs font-medium text-gray-700">{group.name}</span>
                    <div className="ml-2">
                      {group.sets
                        .sort((a, b) => a.set_number - b.set_number)
                        .map((set) => (
                          <div key={set.id} className="text-xs text-gray-500">
                            Série {set.set_number} :
                            {' '}{[
                              set.reps && `${set.reps} reps`,
                              set.weight_kg && `${set.weight_kg}kg`,
                              set.duration_min && `${set.duration_min}min`,
                            ].filter(Boolean).join(' · ')}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
                {session.notes && <p className="text-xs text-gray-500 mt-1">{session.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

// ─── TYPES ───

type Exercise = {
  id: string
  name: string
  muscle_group: string
  category: string
}

type SetEntry = {
  weight_kg: string
  reps: string
  duration_min: string
  duration_unit: string
  rpe: string
  intensity_zone: string
}

type ExerciseBlock = {
  type: 'exercise'
  exercise_id: string
  exercise_name: string
  category: string
  contraction_type: string
  is_unilateral: boolean
  equipment_type: string
  sets: SetEntry[]
}

type CircuitExercise = {
  exercise_id: string
  exercise_name: string
  category: string
  contraction_type: string
  is_unilateral: boolean
  equipment_type: string
  weight_kg: string
  reps: string
  duration_min: string
  duration_unit: string
  rpe: string
  intensity_zone: string
}

type CircuitBlock = {
  type: 'circuit'
  rounds: string
  exercises: CircuitExercise[]
}

type SessionItem = ExerciseBlock | CircuitBlock

type DBExerciseRow = {
  id: string
  exercise_id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  duration_min: number | null
  duration_unit: string | null
  rpe: number | null
  intensity_zone: string | null
  contraction_type: string | null
  is_unilateral: boolean
  equipment_type: string | null
  circuit_group: number | null
  circuit_rounds: number | null
  exercises_library: { name: string; category: string } | null
}

type SportSession = {
  id: string
  date: string
  type: string
  duration_min: number | null
  notes: string | null
  sport_session_exercises: DBExerciseRow[]
}

type HistorySet = {
  reps: number | null
  weight_kg: number | null
  duration_min: number | null
  duration_unit: string | null
  rpe: number | null
  intensity_zone: string | null
}

// ─── CONSTANTS ───

const sessionTypes = ['Muscu', 'Cardio', 'Mobilité', 'Mixte']

const contractionTypes = [
  { value: 'concentrique', label: 'Conc' },
  { value: 'excentrique', label: 'Exc' },
  { value: 'isometrique', label: 'Iso' },
  { value: 'pliometrique', label: 'Plio' },
]

const equipmentTypes = [
  { value: 'barre', label: 'Barre' },
  { value: 'kb_db', label: 'KB/DB' },
  { value: 'machine', label: 'Machine' },
  { value: 'poids_du_corps', label: 'PDC' },
]

const zones = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']

const emptySet = (): SetEntry => ({ weight_kg: '', reps: '', duration_min: '', duration_unit: 'min', rpe: '', intensity_zone: '' })

// ─── COMPONENT ───

export default function SportPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [sessions, setSessions] = useState<SportSession[]>([])
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, { date: string; sets: HistorySet[] }>>({})

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionType, setSessionType] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([])
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)

  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedExerciseId, setSelectedExerciseId] = useState('')

  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customGroup, setCustomGroup] = useState('')
  const [customCategory, setCustomCategory] = useState('muscu')

  const [circuitSelGroup, setCircuitSelGroup] = useState<Record<number, string>>({})
  const [circuitSelExercise, setCircuitSelExercise] = useState<Record<number, string>>({})

  const router = useRouter()

  // ─── LOAD ───

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadExercises()
        loadSessions(user.id)
        loadExerciseHistory(user.id)
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
      .select('*, sport_session_exercises ( id, exercise_id, set_number, reps, weight_kg, duration_min, duration_unit, rpe, intensity_zone, contraction_type, is_unilateral, equipment_type, circuit_group, circuit_rounds, exercises_library ( name, category ) )')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(5)
    setSessions(data || [])
  }

  const loadExerciseHistory = async (userId: string) => {
    const { data } = await supabase
      .from('sport_session_exercises')
      .select('exercise_id, set_number, reps, weight_kg, duration_min, duration_unit, rpe, intensity_zone, sport_sessions!inner ( user_id, date )')
      .eq('sport_sessions.user_id', userId)
      .order('set_number', { ascending: true })

    if (data) {
      const byExercise: Record<string, { date: string; sets: typeof data }[]> = {}
      for (const row of data) {
        const exId = row.exercise_id
        const d = (row.sport_sessions as unknown as { date: string }).date
        if (!byExercise[exId]) byExercise[exId] = []
        let session = byExercise[exId].find((s) => s.date === d)
        if (!session) { session = { date: d, sets: [] }; byExercise[exId].push(session) }
        session.sets.push(row)
      }
      const history: Record<string, { date: string; sets: HistorySet[] }> = {}
      for (const [exId, sess] of Object.entries(byExercise)) {
        const latest = sess.sort((a, b) => b.date.localeCompare(a.date))[0]
        history[exId] = {
          date: latest.date,
          sets: latest.sets.sort((a, b) => a.set_number - b.set_number).map((s) => ({
            reps: s.reps, weight_kg: s.weight_kg, duration_min: s.duration_min,
            duration_unit: s.duration_unit, rpe: s.rpe, intensity_zone: s.intensity_zone,
          })),
        }
      }
      setExerciseHistory(history)
    }
  }

  // ─── HELPERS ───

  const muscleGroups = [...new Set(exercises.map((e) => e.muscle_group))].sort((a, b) => a.localeCompare(b, 'fr'))
  const filteredExercises = exercises.filter((e) => e.muscle_group === selectedGroup).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const getExercise = (id: string) => exercises.find((e) => e.id === id)
  const circuitFilteredExercises = (ci: number) => exercises.filter((e) => e.muscle_group === (circuitSelGroup[ci] || '')).sort((a, b) => a.name.localeCompare(b.name, 'fr'))

  // ─── EXERCISE BLOCK ACTIONS ───

  const addExerciseBlock = () => {
    const ex = getExercise(selectedExerciseId)
    if (!ex) return
    const block: ExerciseBlock = {
      type: 'exercise', exercise_id: ex.id, exercise_name: ex.name, category: ex.category,
      contraction_type: ex.category === 'muscu' ? 'concentrique' : '',
      is_unilateral: false,
      equipment_type: ex.category === 'muscu' ? 'barre' : '',
      sets: [emptySet()],
    }
    setSessionItems([...sessionItems, block])
    setSelectedExerciseId('')
    setSelectedGroup('')
  }

  const updateBlock = (index: number, updates: Partial<ExerciseBlock>) => {
    const items = [...sessionItems]
    items[index] = { ...items[index], ...updates } as SessionItem
    setSessionItems(items)
  }

  const addSet = (blockIndex: number) => {
    const items = [...sessionItems]
    const block = items[blockIndex] as ExerciseBlock
    const last = block.sets[block.sets.length - 1]
    block.sets.push({ ...last })
    setSessionItems(items)
  }

  const removeSet = (blockIndex: number, setIndex: number) => {
    const items = [...sessionItems]
    const block = items[blockIndex] as ExerciseBlock
    block.sets.splice(setIndex, 1)
    if (block.sets.length === 0) items.splice(blockIndex, 1)
    setSessionItems(items)
  }

  const updateSet = (blockIndex: number, setIndex: number, field: keyof SetEntry, value: string) => {
    const items = [...sessionItems]
    const block = items[blockIndex] as ExerciseBlock
    block.sets[setIndex][field] = value
    setSessionItems(items)
  }

  const removeBlock = (index: number) => {
    setSessionItems(sessionItems.filter((_, i) => i !== index))
  }

  // ─── CIRCUIT ACTIONS ───

  const addCircuit = () => {
    const circuit: CircuitBlock = { type: 'circuit', rounds: '3', exercises: [] }
    setSessionItems([...sessionItems, circuit])
  }

  const updateCircuitRounds = (ci: number, rounds: string) => {
    const items = [...sessionItems]
    const circuit = items[ci] as CircuitBlock
    circuit.rounds = rounds
    setSessionItems(items)
  }

  const addExerciseToCircuit = (ci: number) => {
    const exId = circuitSelExercise[ci]
    const ex = getExercise(exId)
    if (!ex) return
    const items = [...sessionItems]
    const circuit = items[ci] as CircuitBlock
    circuit.exercises.push({
      exercise_id: ex.id, exercise_name: ex.name, category: ex.category,
      contraction_type: ex.category === 'muscu' ? 'concentrique' : '',
      is_unilateral: false,
      equipment_type: ex.category === 'muscu' ? 'barre' : '',
      weight_kg: '', reps: '', duration_min: '', duration_unit: 'min', rpe: '', intensity_zone: '',
    })
    setSessionItems(items)
    setCircuitSelExercise({ ...circuitSelExercise, [ci]: '' })
    setCircuitSelGroup({ ...circuitSelGroup, [ci]: '' })
  }

  const updateCircuitExercise = (ci: number, ei: number, field: string, value: string | boolean) => {
    const items = [...sessionItems]
    const circuit = items[ci] as CircuitBlock
    ;(circuit.exercises[ei] as Record<string, string | boolean>)[field] = value
    setSessionItems(items)
  }

  const removeCircuitExercise = (ci: number, ei: number) => {
    const items = [...sessionItems]
    const circuit = items[ci] as CircuitBlock
    circuit.exercises.splice(ei, 1)
    setSessionItems(items)
  }

  // ─── EDIT SESSION ───

  const startEditing = (session: SportSession) => {
    setEditingSessionId(session.id)
    setDate(session.date)
    setSessionType(session.type)
    setDurationMin(session.duration_min?.toString() || '')
    setSessionNotes(session.notes || '')

    const items: SessionItem[] = []

    const regularExercises = session.sport_session_exercises.filter((e) => !e.circuit_group)
    const regularGroups = new Map<string, DBExerciseRow[]>()
    for (const ex of regularExercises) {
      const key = ex.exercise_id
      if (!regularGroups.has(key)) regularGroups.set(key, [])
      regularGroups.get(key)!.push(ex)
    }

    for (const [exId, sets] of regularGroups) {
      const first = sets[0]
      items.push({
        type: 'exercise',
        exercise_id: exId,
        exercise_name: first.exercises_library?.name || 'Inconnu',
        category: first.exercises_library?.category || 'muscu',
        contraction_type: first.contraction_type || 'concentrique',
        is_unilateral: first.is_unilateral,
        equipment_type: first.equipment_type || 'barre',
        sets: sets.sort((a, b) => a.set_number - b.set_number).map((s) => ({
          weight_kg: s.weight_kg?.toString() || '',
          reps: s.reps?.toString() || '',
          duration_min: s.duration_min?.toString() || '',
          duration_unit: s.duration_unit || 'min',
          rpe: s.rpe?.toString() || '',
          intensity_zone: s.intensity_zone || '',
        })),
      })
    }

    const circuitExercises = session.sport_session_exercises.filter((e) => e.circuit_group)
    const circuitGroups = new Map<number, DBExerciseRow[]>()
    for (const ex of circuitExercises) {
      if (!circuitGroups.has(ex.circuit_group!)) circuitGroups.set(ex.circuit_group!, [])
      circuitGroups.get(ex.circuit_group!)!.push(ex)
    }

    for (const [, exs] of circuitGroups) {
      const first = exs[0]
      items.push({
        type: 'circuit',
        rounds: first.circuit_rounds?.toString() || '3',
        exercises: exs.sort((a, b) => a.set_number - b.set_number).map((ex) => ({
          exercise_id: ex.exercise_id,
          exercise_name: ex.exercises_library?.name || 'Inconnu',
          category: ex.exercises_library?.category || 'muscu',
          contraction_type: ex.contraction_type || '',
          is_unilateral: ex.is_unilateral,
          equipment_type: ex.equipment_type || '',
          weight_kg: ex.weight_kg?.toString() || '',
          reps: ex.reps?.toString() || '',
          duration_min: ex.duration_min?.toString() || '',
          duration_unit: ex.duration_unit || 'min',
          rpe: ex.rpe?.toString() || '',
          intensity_zone: ex.intensity_zone || '',
        })),
      })
    }

    setSessionItems(items)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    setEditingSessionId(null)
    setSessionType('')
    setDurationMin('')
    setSessionNotes('')
    setSessionItems([])
    setDate(new Date().toISOString().split('T')[0])
  }

  // ─── CUSTOM EXERCISE ───

  const addCustomExercise = async () => {
    if (!user || !customName || !customGroup) return
    const { data } = await supabase
      .from('exercises_library')
      .insert({ name: customName, muscle_group: customGroup, category: customCategory, is_custom: true, user_id: user.id })
      .select().single()
    if (data) { setExercises([...exercises, data]); setCustomName(''); setCustomGroup(''); setShowCustom(false) }
  }

  // ─── SUBMIT ───

  const buildExerciseRows = (sessionId: string) => {
    const rows: Record<string, unknown>[] = []
    let circuitGroupCounter = 0

    for (const item of sessionItems) {
      if (item.type === 'exercise') {
        for (let i = 0; i < item.sets.length; i++) {
          const s = item.sets[i]
          rows.push({
            session_id: sessionId, exercise_id: item.exercise_id, set_number: i + 1,
            reps: s.reps ? parseInt(s.reps) : null,
            weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
            duration_min: s.duration_min ? parseInt(s.duration_min) : null,
            duration_unit: s.duration_unit || null,
            rpe: s.rpe ? parseInt(s.rpe) : null,
            intensity_zone: s.intensity_zone || null,
            contraction_type: item.contraction_type || null,
            is_unilateral: item.is_unilateral,
            equipment_type: item.equipment_type || null,
            circuit_group: null, circuit_rounds: null,
          })
        }
      } else {
        circuitGroupCounter++
        for (let i = 0; i < item.exercises.length; i++) {
          const ex = item.exercises[i]
          rows.push({
            session_id: sessionId, exercise_id: ex.exercise_id, set_number: i + 1,
            reps: ex.reps ? parseInt(ex.reps) : null,
            weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
            duration_min: ex.duration_min ? parseInt(ex.duration_min) : null,
            duration_unit: ex.duration_unit || null,
            rpe: ex.rpe ? parseInt(ex.rpe) : null,
            intensity_zone: ex.intensity_zone || null,
            contraction_type: ex.contraction_type || null,
            is_unilateral: ex.is_unilateral,
            equipment_type: ex.equipment_type || null,
            circuit_group: circuitGroupCounter,
            circuit_rounds: item.rounds ? parseInt(item.rounds) : null,
          })
        }
      }
    }
    return rows
  }

  const submitSession = async () => {
    if (!user || !sessionType) return

    if (editingSessionId) {
      await supabase.from('sport_sessions').update({
        date, type: sessionType,
        duration_min: durationMin ? parseInt(durationMin) : null,
        notes: sessionNotes || null,
      }).eq('id', editingSessionId)

      await supabase.from('sport_session_exercises').delete().eq('session_id', editingSessionId)

      const rows = buildExerciseRows(editingSessionId)
      if (rows.length > 0) await supabase.from('sport_session_exercises').insert(rows)

      setEditingSessionId(null)
    } else {
      const { data: session } = await supabase
        .from('sport_sessions')
        .insert({ user_id: user.id, date, type: sessionType, duration_min: durationMin ? parseInt(durationMin) : null, notes: sessionNotes || null })
        .select().single()

      if (session) {
        const rows = buildExerciseRows(session.id)
        if (rows.length > 0) await supabase.from('sport_session_exercises').insert(rows)
      }
    }

    setSessionType(''); setDurationMin(''); setSessionNotes(''); setSessionItems([])
    setDate(new Date().toISOString().split('T')[0])
    loadSessions(user.id); loadExerciseHistory(user.id)
  }

  const deleteSession = async (id: string) => {
    await supabase.from('sport_sessions').delete().eq('id', id)
    if (user) { loadSessions(user.id); loadExerciseHistory(user.id) }
  }

  // ─── DISPLAY HELPERS ───

  const organizeSession = (session: SportSession) => {
    const regular: { name: string; category: string; contraction: string | null; equipment: string | null; unilateral: boolean; sets: DBExerciseRow[] }[] = []
    const circuitsMap: Record<number, { rounds: number | null; exercises: DBExerciseRow[] }> = {}

    for (const ex of session.sport_session_exercises) {
      if (ex.circuit_group) {
        if (!circuitsMap[ex.circuit_group]) circuitsMap[ex.circuit_group] = { rounds: ex.circuit_rounds, exercises: [] }
        circuitsMap[ex.circuit_group].exercises.push(ex)
      } else {
        const name = ex.exercises_library?.name || 'Inconnu'
        let group = regular.find((g) => g.name === name && g.contraction === ex.contraction_type)
        if (!group) {
          group = { name, category: ex.exercises_library?.category || '', contraction: ex.contraction_type, equipment: ex.equipment_type, unilateral: ex.is_unilateral, sets: [] }
          regular.push(group)
        }
        group.sets.push(ex)
      }
    }

    return { regular, circuits: Object.values(circuitsMap) }
  }

  const formatSetDisplay = (ex: DBExerciseRow) => {
    const unit = ex.duration_unit || 'min'
    const cat = ex.exercises_library?.category
    if (cat === 'cardio') {
      return [ex.intensity_zone, ex.duration_min && `${ex.duration_min}${unit}`].filter(Boolean).join(' · ')
    }
    if (cat === 'mobilite') {
      return ex.duration_min ? `${ex.duration_min}${unit}` : ''
    }
    if (ex.contraction_type === 'isometrique') {
      return [ex.weight_kg && `${ex.weight_kg}kg`, ex.duration_min && `${ex.duration_min}${unit}`, ex.rpe && `RPE${ex.rpe}`].filter(Boolean).join(' · ')
    }
    return [ex.weight_kg && `${ex.weight_kg}kg`, ex.reps && `${ex.reps}r`, ex.rpe && `RPE${ex.rpe}`].filter(Boolean).join(' · ')
  }

  const formatHistorySet = (s: HistorySet) => {
    const unit = s.duration_unit || 'min'
    return [s.weight_kg && `${s.weight_kg}kg`, s.reps && `${s.reps}r`, s.duration_min && `${s.duration_min}${unit}`, s.rpe && `RPE${s.rpe}`, s.intensity_zone].filter(Boolean).join('·')
  }

  // ─── RENDER HELPERS ───

  const DurationToggle = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div className="flex gap-1">
      {['sec', 'min'].map((u) => (
        <button key={u} onClick={() => onChange(u)}
          className={`px-2 py-1 rounded-lg text-[10px] transition-all ${value === u ? 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'}`}
        >{u}</button>
      ))}
    </div>
  )

  const renderMusculOptions = (
    contraction: string, equipment: string, unilateral: boolean,
    onContraction: (v: string) => void, onEquipment: (v: string) => void, onUnilateral: (v: boolean) => void,
  ) => (
    <div className="space-y-3 mb-4">
      <div className="flex gap-2 flex-wrap">
        {contractionTypes.map((ct) => (
          <button key={ct.value} onClick={() => onContraction(ct.value)}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${contraction === ct.value ? 'bg-[var(--accent-purple)]/20 ring-1 ring-[var(--accent-purple)] text-[var(--accent-purple)]' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'}`}
          >{ct.label}</button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {equipmentTypes.map((eq) => (
          <button key={eq.value} onClick={() => onEquipment(eq.value)}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${equipment === eq.value ? 'bg-[var(--accent-blue)]/20 ring-1 ring-[var(--accent-blue)] text-[var(--accent-blue)]' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'}`}
          >{eq.label}</button>
        ))}
      </div>
      <button onClick={() => onUnilateral(!unilateral)}
        className={`px-3 py-2 rounded-xl text-xs transition-all ${unilateral ? 'bg-[var(--accent-orange)]/20 ring-1 ring-[var(--accent-orange)] text-[var(--accent-orange)]' : 'bg-[var(--bg-card)] text-[var(--text-tertiary)]'}`}
      >🔄 Unilatéral</button>
    </div>
  )

  const renderSetRows = (block: ExerciseBlock, blockIndex: number) => {
    const isIso = block.contraction_type === 'isometrique'

    if (block.category === 'cardio') {
      return (
        <>
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mb-1 text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Zone</span><span>Durée</span><span></span><span></span>
          </div>
          {block.sets.map((set, si) => (
            <div key={si} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 mb-2 items-center">
              <select value={set.intensity_zone} onChange={(e) => updateSet(blockIndex, si, 'intensity_zone', e.target.value)} className="p-2 rounded-lg text-xs">
                <option value="">—</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
              <input type="number" placeholder="—" value={set.duration_min} onChange={(e) => updateSet(blockIndex, si, 'duration_min', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
              <DurationToggle value={set.duration_unit || 'min'} onChange={(v) => updateSet(blockIndex, si, 'duration_unit', v)} />
              <button onClick={() => removeSet(blockIndex, si)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs">✕</button>
            </div>
          ))}
        </>
      )
    }

    if (block.category === 'mobilite') {
      return (
        <>
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 mb-1 text-[10px] text-[var(--text-tertiary)] px-1">
            <span>Durée</span><span></span><span></span>
          </div>
          {block.sets.map((set, si) => (
            <div key={si} className="grid grid-cols-[1fr_auto_auto] gap-2 mb-2 items-center">
              <input type="number" placeholder="—" value={set.duration_min} onChange={(e) => updateSet(blockIndex, si, 'duration_min', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
              <DurationToggle value={set.duration_unit || 'min'} onChange={(v) => updateSet(blockIndex, si, 'duration_unit', v)} />
              <button onClick={() => removeSet(blockIndex, si)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs">✕</button>
            </div>
          ))}
        </>
      )
    }

    if (isIso) {
      return (
        <>
          <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 mb-1 text-[10px] text-[var(--text-tertiary)] px-1">
            <span>#</span><span>Kg</span><span>Durée</span><span></span><span>RPE</span>
          </div>
          {block.sets.map((set, si) => (
            <div key={si} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 mb-2 items-center">
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-tertiary)] w-4">{si + 1}</span>
                <button onClick={() => removeSet(blockIndex, si)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs">✕</button>
              </div>
              <input type="number" placeholder="kg" value={set.weight_kg} onChange={(e) => updateSet(blockIndex, si, 'weight_kg', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
              <input type="number" placeholder="—" value={set.duration_min} onChange={(e) => updateSet(blockIndex, si, 'duration_min', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
              <DurationToggle value={set.duration_unit || 'sec'} onChange={(v) => updateSet(blockIndex, si, 'duration_unit', v)} />
              <select value={set.rpe} onChange={(e) => updateSet(blockIndex, si, 'rpe', e.target.value)} className="p-1.5 rounded-lg text-xs text-center">
                <option value="">—</option>
                {[1,2,3,4,5,6,7,8,9,10].map((r) => <option key={r} value={r.toString()}>{r}</option>)}
              </select>
            </div>
          ))}
        </>
      )
    }

    return (
      <>
        <div className="grid grid-cols-4 gap-2 mb-1 text-[10px] text-[var(--text-tertiary)] px-1">
          <span>#</span><span>Kg</span><span>Reps</span><span>RPE</span>
        </div>
        {block.sets.map((set, si) => (
          <div key={si} className="grid grid-cols-4 gap-2 mb-2 items-center">
            <div className="flex items-center gap-1">
              <span className="text-xs text-[var(--text-tertiary)] w-4">{si + 1}</span>
              <button onClick={() => removeSet(blockIndex, si)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs">✕</button>
            </div>
            <input type="number" placeholder="kg" value={set.weight_kg} onChange={(e) => updateSet(blockIndex, si, 'weight_kg', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
            <input type="number" placeholder="reps" value={set.reps} onChange={(e) => updateSet(blockIndex, si, 'reps', e.target.value)} className="p-2 rounded-lg text-sm text-center" />
            <select value={set.rpe} onChange={(e) => updateSet(blockIndex, si, 'rpe', e.target.value)} className="p-1.5 rounded-lg text-xs text-center">
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9,10].map((r) => <option key={r} value={r.toString()}>{r}</option>)}
            </select>
          </div>
        ))}
      </>
    )
  }

  const renderCircuitExerciseFields = (ex: CircuitExercise, ci: number, ei: number) => {
    if (ex.category === 'cardio') {
      return (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2">
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">Zone</label>
            <select value={ex.intensity_zone} onChange={(e) => updateCircuitExercise(ci, ei, 'intensity_zone', e.target.value)} className="w-full p-2 rounded-lg text-xs">
              <option value="">—</option>
              {zones.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">Durée</label>
            <input type="number" placeholder="—" value={ex.duration_min} onChange={(e) => updateCircuitExercise(ci, ei, 'duration_min', e.target.value)} className="w-full p-2 rounded-lg text-sm text-center" />
          </div>
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">&nbsp;</label>
            <DurationToggle value={ex.duration_unit || 'min'} onChange={(v) => updateCircuitExercise(ci, ei, 'duration_unit', v)} />
          </div>
        </div>
      )
    }
    if (ex.category === 'mobilite') {
      return (
        <div className="flex gap-2 mt-2 items-end">
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1">Durée</label>
            <input type="number" placeholder="—" value={ex.duration_min} onChange={(e) => updateCircuitExercise(ci, ei, 'duration_min', e.target.value)} className="p-2 rounded-lg text-sm text-center w-20" />
          </div>
          <DurationToggle value={ex.duration_unit || 'min'} onChange={(v) => updateCircuitExercise(ci, ei, 'duration_unit', v)} />
        </div>
      )
    }

    const isIso = ex.contraction_type === 'isometrique'
    return (
      <div className="mt-2 space-y-2">
        {renderMusculOptions(
          ex.contraction_type, ex.equipment_type, ex.is_unilateral,
          (v) => updateCircuitExercise(ci, ei, 'contraction_type', v),
          (v) => updateCircuitExercise(ci, ei, 'equipment_type', v),
          (v) => updateCircuitExercise(ci, ei, 'is_unilateral', v),
        )}
        <div className={`grid ${isIso ? 'grid-cols-[1fr_1fr_auto_auto]' : 'grid-cols-3'} gap-2`}>
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">Kg</label>
            <input type="number" placeholder="—" value={ex.weight_kg} onChange={(e) => updateCircuitExercise(ci, ei, 'weight_kg', e.target.value)} className="w-full p-2 rounded-lg text-sm text-center" />
          </div>
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">{isIso ? 'Durée' : 'Reps'}</label>
            {isIso ? (
              <input type="number" placeholder="—" value={ex.duration_min} onChange={(e) => updateCircuitExercise(ci, ei, 'duration_min', e.target.value)} className="w-full p-2 rounded-lg text-sm text-center" />
            ) : (
              <input type="number" placeholder="—" value={ex.reps} onChange={(e) => updateCircuitExercise(ci, ei, 'reps', e.target.value)} className="w-full p-2 rounded-lg text-sm text-center" />
            )}
          </div>
          {isIso && (
            <div className="flex items-end">
              <DurationToggle value={ex.duration_unit || 'sec'} onChange={(v) => updateCircuitExercise(ci, ei, 'duration_unit', v)} />
            </div>
          )}
          <div>
            <label className="block text-[9px] text-[var(--text-tertiary)] mb-1 text-center">RPE</label>
            <select value={ex.rpe} onChange={(e) => updateCircuitExercise(ci, ei, 'rpe', e.target.value)} className="w-full p-2 rounded-lg text-xs text-center">
              <option value="">—</option>
              {[1,2,3,4,5,6,7,8,9,10].map((r) => <option key={r} value={r.toString()}>{r}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  // ─── RENDER ───

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🏋️ Sport</h1>

        <Card className="mb-5">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold">{editingSessionId ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
            {editingSessionId && (
              <button onClick={cancelEditing} className="text-xs text-[var(--text-tertiary)] hover:underline">Annuler</button>
            )}
          </div>
          <div className="space-y-5">

            {/* Date & Duration */}
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

            {/* Session type */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Type</label>
              <div className="flex gap-2">
                {sessionTypes.map((t) => (
                  <motion.button key={t} whileTap={{ scale: 0.95 }}
                    onClick={() => { setSessionType(t); if (t === 'Cardio') setSelectedGroup('Cardio'); else if (t === 'Mobilité') setSelectedGroup('Mobilité'); else setSelectedGroup('') }}
                    className={`px-4 py-2 rounded-xl text-sm transition-all duration-200 ${sessionType === t ? 'bg-[var(--accent-red)]/20 ring-1 ring-[var(--accent-red)]' : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                  >{t}</motion.button>
                ))}
              </div>
            </div>

            {/* Exercises section */}
            <div className="border-t border-[var(--border)] pt-5">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs text-[var(--text-tertiary)] ml-1">Exercices</label>
                <div className="flex gap-3">
                  <button onClick={() => setShowCustom(!showCustom)} className="text-xs text-[var(--accent-purple)] hover:underline">
                    {showCustom ? 'Annuler' : '+ Custom'}
                  </button>
                  <button onClick={addCircuit} className="text-xs text-[var(--accent-green)] hover:underline">+ Circuit</button>
                </div>
              </div>

              {/* Custom exercise form */}
              {showCustom && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-[var(--bg-secondary)] p-4 rounded-xl mb-4 space-y-3">
                  <input type="text" placeholder="Nom de l'exercice" value={customName} onChange={(e) => setCustomName(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                  <input type="text" placeholder="Groupe musculaire" value={customGroup} onChange={(e) => setCustomGroup(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                  <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full p-3 rounded-xl text-sm">
                    <option value="muscu">Muscu</option><option value="cardio">Cardio</option><option value="mobilite">Mobilité</option><option value="autre">Autre</option>
                  </select>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={addCustomExercise} className="w-full bg-[var(--accent-purple)] text-white p-3 rounded-xl text-sm font-medium">Ajouter à la bibliothèque</motion.button>
                </motion.div>
              )}

              {/* Exercise selector */}
              <div className="space-y-3 mb-4">
                <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setSelectedExerciseId('') }} className="w-full p-3 rounded-xl text-sm">
                  <option value="">-- Groupe musculaire --</option>
                  {muscleGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                {selectedGroup && (
                  <div className="flex gap-2">
                    <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)} className="flex-1 p-3 rounded-xl text-sm">
                      <option value="">-- Exercice --</option>
                      {filteredExercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                    {selectedExerciseId && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={addExerciseBlock} className="bg-[var(--accent-red)]/20 text-[var(--accent-red)] px-4 rounded-xl text-sm font-medium">+</motion.button>
                    )}
                  </div>
                )}
              </div>

              {/* Session items */}
              {sessionItems.map((item, index) => {
                if (item.type === 'exercise') {
                  const block = item as ExerciseBlock
                  return (
                    <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{block.exercise_name}</span>
                        <button onClick={() => removeBlock(index)} className="text-[var(--accent-red)] text-xs hover:underline">Supprimer</button>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2 text-[9px]">
                        {block.category === 'muscu' && block.contraction_type && (
                          <span className="px-1.5 py-0.5 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] rounded">{contractionTypes.find((c) => c.value === block.contraction_type)?.label}</span>
                        )}
                        {block.equipment_type && (
                          <span className="px-1.5 py-0.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded">{equipmentTypes.find((e) => e.value === block.equipment_type)?.label}</span>
                        )}
                        {block.is_unilateral && (
                          <span className="px-1.5 py-0.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] rounded">Unilat.</span>
                        )}
                      </div>

                      {exerciseHistory[block.exercise_id] && (
                        <div className="bg-[var(--bg-card)] p-2 rounded-lg mb-3 text-[10px] text-[var(--text-tertiary)]">
                          📋 Dernière ({new Date(exerciseHistory[block.exercise_id].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}) : {exerciseHistory[block.exercise_id].sets.map((s, i) => `S${i + 1}: ${formatHistorySet(s)}`).join(' · ')}
                        </div>
                      )}

                      {block.category === 'muscu' && renderMusculOptions(
                        block.contraction_type, block.equipment_type, block.is_unilateral,
                        (v) => updateBlock(index, { contraction_type: v } as Partial<ExerciseBlock>),
                        (v) => updateBlock(index, { equipment_type: v } as Partial<ExerciseBlock>),
                        (v) => updateBlock(index, { is_unilateral: v } as Partial<ExerciseBlock>),
                      )}

                      {renderSetRows(block, index)}

                      <button onClick={() => addSet(index)} className="text-xs text-[var(--accent-purple)] mt-1 hover:underline">+ Ajouter une série</button>
                    </motion.div>
                  )
                }

                const circuit = item as CircuitBlock
                return (
                  <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-3 border border-[var(--accent-green)]/30"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[var(--accent-green)]">🔁 Circuit</span>
                        <input type="number" value={circuit.rounds} onChange={(e) => updateCircuitRounds(index, e.target.value)}
                          className="w-12 p-1 rounded-lg text-xs text-center" placeholder="tours" />
                        <span className="text-xs text-[var(--text-tertiary)]">tours</span>
                      </div>
                      <button onClick={() => removeBlock(index)} className="text-[var(--accent-red)] text-xs hover:underline">Supprimer</button>
                    </div>

                    {circuit.exercises.map((ex, ei) => (
                      <div key={ei} className="bg-[var(--bg-card)] rounded-lg p-3 mb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{ex.exercise_name}</span>
                          <button onClick={() => removeCircuitExercise(index, ei)} className="text-[var(--accent-red)]/50 text-xs">✕</button>
                        </div>
                        {renderCircuitExerciseFields(ex, index, ei)}
                      </div>
                    ))}

                    <div className="space-y-2 mt-3">
                      <select value={circuitSelGroup[index] || ''} onChange={(e) => { setCircuitSelGroup({ ...circuitSelGroup, [index]: e.target.value }); setCircuitSelExercise({ ...circuitSelExercise, [index]: '' }) }} className="w-full p-2 rounded-lg text-xs">
                        <option value="">-- Groupe --</option>
                        {muscleGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {circuitSelGroup[index] && (
                        <div className="flex gap-2">
                          <select value={circuitSelExercise[index] || ''} onChange={(e) => setCircuitSelExercise({ ...circuitSelExercise, [index]: e.target.value })} className="flex-1 p-2 rounded-lg text-xs">
                            <option value="">-- Exercice --</option>
                            {circuitFilteredExercises(index).map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                          </select>
                          {circuitSelExercise[index] && (
                            <button onClick={() => addExerciseToCircuit(index)} className="bg-[var(--accent-green)]/20 text-[var(--accent-green)] px-3 rounded-lg text-xs">+</button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <input type="text" placeholder="Notes (optionnel)" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} className="w-full p-3 rounded-xl text-sm" />

            <motion.button whileTap={{ scale: 0.97 }} onClick={submitSession} disabled={!sessionType}
              className="w-full bg-[var(--accent-red)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >{editingSessionId ? 'Modifier la séance' : 'Enregistrer la séance'}</motion.button>
          </div>
        </Card>

        {/* ─── HISTORY ─── */}
        <Card delay={0.1}>
          <h2 className="text-lg font-semibold mb-4">Dernières séances</h2>
          {sessions.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucune séance enregistrée</p>
          ) : (
            <div className="space-y-4">
              {sessions.map((session, i) => {
                const { regular, circuits } = organizeSession(session)
                return (
                  <motion.div key={session.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="bg-[var(--bg-secondary)] p-4 rounded-xl">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">
                        {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {session.type}
                      </span>
                      <div className="flex items-center gap-3">
                        {session.duration_min && <span className="text-[var(--text-tertiary)] text-xs">{session.duration_min} min</span>}
                        <button onClick={() => startEditing(session)} className="text-[var(--accent-purple)] text-xs hover:underline">✏️</button>
                        <button onClick={() => deleteSession(session.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                      </div>
                    </div>

                    {regular.map((group, gi) => (
                      <div key={gi} className="ml-2 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{group.name}</span>
                          {group.contraction && <span className="text-[8px] px-1 py-0.5 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] rounded">{contractionTypes.find((c) => c.value === group.contraction)?.label}</span>}
                          {group.equipment && <span className="text-[8px] px-1 py-0.5 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] rounded">{equipmentTypes.find((e) => e.value === group.equipment)?.label}</span>}
                          {group.unilateral && <span className="text-[8px] px-1 py-0.5 bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] rounded">Uni</span>}
                        </div>
                        <div className="ml-2">
                          {group.sets.sort((a, b) => a.set_number - b.set_number).map((set) => (
                            <div key={set.id} className="text-[11px] text-[var(--text-tertiary)]">
                              S{set.set_number} : {formatSetDisplay(set)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {circuits.map((circuit, ci) => (
                      <div key={ci} className="ml-2 mb-2 border-l-2 border-[var(--accent-green)]/30 pl-2">
                        <span className="text-xs font-medium text-[var(--accent-green)]">🔁 Circuit · {circuit.rounds} tours</span>
                        {circuit.exercises.sort((a, b) => a.set_number - b.set_number).map((ex) => (
                          <div key={ex.id} className="text-[11px] text-[var(--text-tertiary)] ml-2">
                            {ex.exercises_library?.name} : {formatSetDisplay(ex)}
                          </div>
                        ))}
                      </div>
                    ))}

                    {session.notes && <p className="text-xs text-[var(--text-tertiary)] mt-1">{session.notes}</p>}
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

// ─── CONSTANTS ───

const moods = [
  { score: 1, emoji: '😞', label: 'Très mal' },
  { score: 2, emoji: '😕', label: 'Pas top' },
  { score: 3, emoji: '😐', label: 'Neutre' },
  { score: 4, emoji: '🙂', label: 'Bien' },
  { score: 5, emoji: '😄', label: 'Super' },
]

const energyLevels = [
  { score: 1, emoji: '🪫', label: 'Vidé' },
  { score: 2, emoji: '😴', label: 'Fatigué' },
  { score: 3, emoji: '🔋', label: 'Normal' },
  { score: 4, emoji: '⚡', label: 'Énergique' },
  { score: 5, emoji: '🚀', label: 'À fond' },
]

const stressLevels = [
  { score: 1, emoji: '😌', label: 'Zen' },
  { score: 2, emoji: '🙂', label: 'Calme' },
  { score: 3, emoji: '😐', label: 'Moyen' },
  { score: 4, emoji: '😰', label: 'Tendu' },
  { score: 5, emoji: '🤯', label: 'Max' },
]

const emotionalTags = [
  { value: 'joyeux', emoji: '😊', label: 'Joyeux' },
  { value: 'motive', emoji: '🔥', label: 'Motivé' },
  { value: 'concentre', emoji: '🎯', label: 'Concentré' },
  { value: 'confiant', emoji: '😎', label: 'Confiant' },
  { value: 'calme', emoji: '😌', label: 'Calme' },
  { value: 'reconnaissant', emoji: '🙏', label: 'Reconnaissant' },
  { value: 'satisfait', emoji: '👌', label: 'Satisfait' },
  { value: 'connecte', emoji: '🤗', label: 'Connecté' },
  { value: 'frustre', emoji: '😤', label: 'Frustré' },
  { value: 'anxieux', emoji: '😰', label: 'Anxieux' },
  { value: 'irritable', emoji: '😠', label: 'Irritable' },
  { value: 'submerge', emoji: '🤯', label: 'Submergé' },
  { value: 'triste', emoji: '😔', label: 'Triste' },
  { value: 'epuise', emoji: '😴', label: 'Épuisé' },
  { value: 'ennuye', emoji: '😐', label: 'Ennuyé' },
  { value: 'detache', emoji: '🫥', label: 'Détaché' },
]

type MoodCheck = {
  id: string
  score: number
  energy: number | null
  stress: number | null
  tags: string[]
  note: string | null
  created_at: string
}

// ─── COMPONENT ───

export default function MoodPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [stress, setStress] = useState(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [todayMoods, setTodayMoods] = useState<MoodCheck[]>([])
  const [weekMoods, setWeekMoods] = useState<MoodCheck[]>([])
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadMoods(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadMoods = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data: todayData } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
    setTodayMoods(todayData || [])

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { data: weekData } = await supabase
      .from('mood_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: false })
    setWeekMoods(weekData || [])
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag))
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const resetForm = () => {
    setScore(0)
    setEnergy(0)
    setStress(0)
    setSelectedTags([])
    setNote('')
  }

  const submitMood = async () => {
    if (!user || score === 0) return
    setSubmitting(true)

    await supabase.from('mood_checks').insert({
      user_id: user.id,
      score,
      energy: energy || null,
      stress: stress || null,
      tags: selectedTags,
      note: note || null,
    })

    resetForm()
    loadMoods(user.id)
    setTimeout(() => setSubmitting(false), 500)
  }

  const deleteMood = async (id: string) => {
    await supabase.from('mood_checks').delete().eq('id', id)
    if (user) loadMoods(user.id)
  }

  // ─── STATS ───

  const weekAvg = weekMoods.length > 0
    ? (weekMoods.reduce((a, b) => a + b.score, 0) / weekMoods.length).toFixed(1)
    : null

  const weekEnergyAvg = weekMoods.filter((m) => m.energy).length > 0
    ? (weekMoods.filter((m) => m.energy).reduce((a, b) => a + (b.energy || 0), 0) / weekMoods.filter((m) => m.energy).length).toFixed(1)
    : null

  const weekStressAvg = weekMoods.filter((m) => m.stress).length > 0
    ? (weekMoods.filter((m) => m.stress).reduce((a, b) => a + (b.stress || 0), 0) / weekMoods.filter((m) => m.stress).length).toFixed(1)
    : null

  // ─── RENDER HELPERS ───

  const ScoreRow = ({ items, value, onChange, label }: {
    items: { score: number; emoji: string; label: string }[]
    value: number
    onChange: (v: number) => void
    label: string
  }) => (
    <div>
      <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">{label}</label>
      <div className="flex justify-between">
        {items.map((item) => (
          <motion.button key={item.score} whileTap={{ scale: 0.85 }}
            onClick={() => onChange(value === item.score ? 0 : item.score)}
            className={`flex flex-col items-center p-2.5 rounded-2xl transition-all duration-200 ${
              value === item.score
                ? 'bg-[var(--accent-purple)]/20 ring-1 ring-[var(--accent-purple)]'
                : 'hover:bg-[var(--bg-card-hover)]'
            }`}
          >
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-[9px] text-[var(--text-tertiary)] mt-1">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">🧠 Mood</h1>

        {/* ─── CHECK-IN ─── */}
        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-5">Comment tu te sens ?</h2>
          <div className="space-y-5">

            <ScoreRow items={moods} value={score} onChange={setScore} label="Humeur" />
            <ScoreRow items={energyLevels} value={energy} onChange={setEnergy} label="Énergie" />
            <ScoreRow items={stressLevels} value={stress} onChange={setStress} label="Stress" />

            {/* Tags */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">
                Émotions <span className="text-[var(--text-tertiary)]">({selectedTags.length}/3)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {emotionalTags.map((tag) => (
                  <button key={tag.value} onClick={() => toggleTag(tag.value)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
                      selectedTags.includes(tag.value)
                        ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] ring-1 ring-[var(--accent-purple)]/50'
                        : selectedTags.length >= 3
                          ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] opacity-40'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >{tag.emoji} {tag.label}</button>
                ))}
              </div>
            </div>

            {/* Note */}
            <input type="text" placeholder="Une note ? (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-3 rounded-xl text-sm" />

            {/* Submit */}
            <motion.button whileTap={{ scale: 0.97 }} onClick={submitMood} disabled={score === 0 || submitting}
              className="w-full bg-[var(--accent-purple)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >Enregistrer le check-in</motion.button>
          </div>
        </Card>

        {/* ─── WEEK AVERAGES ─── */}
        {weekAvg && (
          <Card className="mb-5" delay={0.1}>
            <p className="text-xs text-[var(--text-tertiary)] mb-3 text-center">Moyennes sur 7 jours</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{weekAvg}</p>
                <p className="text-lg mt-0.5">{moods.find((m) => m.score === Math.round(Number(weekAvg)))?.emoji}</p>
                <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Humeur</p>
              </div>
              {weekEnergyAvg && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{weekEnergyAvg}</p>
                  <p className="text-lg mt-0.5">{energyLevels.find((e) => e.score === Math.round(Number(weekEnergyAvg)))?.emoji}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Énergie</p>
                </div>
              )}
              {weekStressAvg && (
                <div className="bg-[var(--bg-secondary)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold">{weekStressAvg}</p>
                  <p className="text-lg mt-0.5">{stressLevels.find((s) => s.score === Math.round(Number(weekStressAvg)))?.emoji}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-1">Stress</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ─── TODAY ─── */}
        <Card delay={0.2}>
          <h2 className="text-lg font-semibold mb-4">Aujourd&apos;hui</h2>
          {todayMoods.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucun check pour le moment</p>
          ) : (
            <div className="space-y-3">
              {todayMoods.map((mood, i) => (
                <motion.div key={mood.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                >
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{moods.find((m) => m.score === mood.score)?.emoji}</span>
                      {mood.energy && <span className="text-sm">{energyLevels.find((e) => e.score === mood.energy)?.emoji}</span>}
                      {mood.stress && <span className="text-sm">{stressLevels.find((s) => s.score === mood.stress)?.emoji}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--text-tertiary)] text-xs">
                        {new Date(mood.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button onClick={() => deleteMood(mood.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                    </div>
                  </div>

                  {mood.tags && mood.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {mood.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-[var(--accent-purple)]/10 rounded-full text-[10px] text-[var(--accent-purple)]">
                          {emotionalTags.find((t) => t.value === tag)?.emoji} {emotionalTags.find((t) => t.value === tag)?.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {mood.note && <p className="text-xs text-[var(--text-tertiary)] mt-1">{mood.note}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
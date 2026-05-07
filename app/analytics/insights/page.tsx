'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../../components/PageTransition'
import Card from '../../components/Card'
import { motion } from 'framer-motion'

// ─── TYPES ───

type MoodRow = { score: number; energy: number | null; stress: number | null; created_at: string }
type SleepRow = { date: string; bedtime: string; wake_time: string; quality: number }
type SportRow = { date: string; type: string }
type NutritionRow = { date: string; quantity: string | null; protein_focus: boolean; quality: string | null; hydration: boolean }

type Insight = { emoji: string; text: string; delta: string; positive: boolean }

// ─── HELPERS ───

const getSleepDuration = (bedtime: string, wakeTime: string): number => {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  const bedMin = bh * 60 + bm
  const wakeMin = wh * 60 + wm
  const duration = bedMin > wakeMin ? (1440 - bedMin) + wakeMin : wakeMin - bedMin
  return duration / 60
}

const getDateStr = (dateOrTimestamp: string): string => {
  return dateOrTimestamp.split('T')[0]
}

const avg = (nums: number[]): number => {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ─── COMPONENT ───

export default function InsightsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Week data
  const [weekMood, setWeekMood] = useState<{ avg: string; energy: string; stress: string; count: number }>({ avg: '-', energy: '-', stress: '-', count: 0 })
  const [weekSleep, setWeekSleep] = useState<{ avg: string; quality: string; count: number }>({ avg: '-', quality: '-', count: 0 })
  const [weekSport, setWeekSport] = useState<{ count: number }>({ count: 0 })
  const [weekNutrition, setWeekNutrition] = useState<{ equilibre: string; hydrate: string; protein: string; count: number }>({ equilibre: '-', hydrate: '-', protein: '-', count: 0 })

  // Insights
  const [insights, setInsights] = useState<Insight[]>([])
  const [daysOfData, setDaysOfData] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadData(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadData = async (userId: string) => {
    const now = new Date()
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30)
    const weekStr = weekAgo.toISOString().split('T')[0]
    const monthStr = monthAgo.toISOString().split('T')[0]

    // ─── WEEK DATA ───

    const [moodRes, sleepRes, sportRes, nutritionRes] = await Promise.all([
      supabase.from('mood_checks').select('score, energy, stress, created_at').eq('user_id', userId).gte('created_at', weekAgo.toISOString()),
      supabase.from('sleep_logs').select('date, bedtime, wake_time, quality').eq('user_id', userId).gte('date', weekStr),
      supabase.from('sport_sessions').select('date, type').eq('user_id', userId).gte('date', weekStr),
      supabase.from('nutrition_logs').select('date, quantity, protein_focus, quality, hydration').eq('user_id', userId).gte('date', weekStr),
    ])

    const moodData = (moodRes.data || []) as MoodRow[]
    const sleepData = (sleepRes.data || []) as SleepRow[]
    const sportData = (sportRes.data || []) as SportRow[]
    const nutritionData = (nutritionRes.data || []) as NutritionRow[]

    // Mood week
    if (moodData.length > 0) {
      const energies = moodData.filter((m) => m.energy).map((m) => m.energy!)
      const stresses = moodData.filter((m) => m.stress).map((m) => m.stress!)
      setWeekMood({
        avg: avg(moodData.map((m) => m.score)).toFixed(1),
        energy: energies.length > 0 ? avg(energies).toFixed(1) : '-',
        stress: stresses.length > 0 ? avg(stresses).toFixed(1) : '-',
        count: moodData.length,
      })
    }

    // Sleep week
    if (sleepData.length > 0) {
      const durations = sleepData.map((s) => getSleepDuration(s.bedtime, s.wake_time))
      setWeekSleep({
        avg: avg(durations).toFixed(1) + 'h',
        quality: avg(sleepData.map((s) => s.quality)).toFixed(1),
        count: sleepData.length,
      })
    }

    // Sport week
    setWeekSport({ count: sportData.length })

    // Nutrition week
    if (nutritionData.length > 0) {
      const total = nutritionData.length
      const equi = nutritionData.filter((n) => n.quality === 'equilibre').length
      const hydra = nutritionData.filter((n) => n.hydration).length
      const prot = nutritionData.filter((n) => n.protein_focus).length
      setWeekNutrition({
        equilibre: Math.round((equi / total) * 100) + '%',
        hydrate: Math.round((hydra / total) * 100) + '%',
        protein: Math.round((prot / total) * 100) + '%',
        count: total,
      })
    }

    // ─── 30-DAY CORRELATIONS ───

    const [mood30Res, sleep30Res, sport30Res, nutrition30Res] = await Promise.all([
      supabase.from('mood_checks').select('score, energy, stress, created_at').eq('user_id', userId).gte('created_at', monthAgo.toISOString()),
      supabase.from('sleep_logs').select('date, bedtime, wake_time, quality').eq('user_id', userId).gte('date', monthStr),
      supabase.from('sport_sessions').select('date, type').eq('user_id', userId).gte('date', monthStr),
      supabase.from('nutrition_logs').select('date, quantity, protein_focus, quality, hydration').eq('user_id', userId).gte('date', monthStr),
    ])

    const mood30 = (mood30Res.data || []) as MoodRow[]
    const sleep30 = (sleep30Res.data || []) as SleepRow[]
    const sport30 = (sport30Res.data || []) as SportRow[]
    const nutrition30 = (nutrition30Res.data || []) as NutritionRow[]

    // Count distinct days of data
    const allDates = new Set([
      ...mood30.map((m) => getDateStr(m.created_at)),
      ...sleep30.map((s) => s.date),
      ...sport30.map((s) => s.date),
      ...nutrition30.map((n) => n.date),
    ])
    setDaysOfData(allDates.size)

    if (allDates.size < 30) return

    // Build mood by date (average if multiple per day)
    const moodByDate: Record<string, { score: number; energy: number | null; stress: number | null }[]> = {}
    for (const m of mood30) {
      const d = getDateStr(m.created_at)
      if (!moodByDate[d]) moodByDate[d] = []
      moodByDate[d].push(m)
    }

    const dailyMood: Record<string, number> = {}
    const dailyEnergy: Record<string, number> = {}
    const dailyStress: Record<string, number> = {}
    for (const [date, entries] of Object.entries(moodByDate)) {
      dailyMood[date] = avg(entries.map((e) => e.score))
      const energies = entries.filter((e) => e.energy).map((e) => e.energy!)
      if (energies.length > 0) dailyEnergy[date] = avg(energies)
      const stresses = entries.filter((e) => e.stress).map((e) => e.stress!)
      if (stresses.length > 0) dailyStress[date] = avg(stresses)
    }

    const sportDates = new Set(sport30.map((s) => s.date))

    const sleepByDate: Record<string, { duration: number; quality: number }> = {}
    for (const s of sleep30) {
      sleepByDate[s.date] = { duration: getSleepDuration(s.bedtime, s.wake_time), quality: s.quality }
    }

    const nutritionByDate: Record<string, NutritionRow[]> = {}
    for (const n of nutrition30) {
      if (!nutritionByDate[n.date]) nutritionByDate[n.date] = []
      nutritionByDate[n.date].push(n)
    }

    const newInsights: Insight[] = []

    // 1. Sport → Mood
    const moodWithSport = Object.entries(dailyMood).filter(([d]) => sportDates.has(d)).map(([, v]) => v)
    const moodWithoutSport = Object.entries(dailyMood).filter(([d]) => !sportDates.has(d)).map(([, v]) => v)
    if (moodWithSport.length >= 3 && moodWithoutSport.length >= 3) {
      const diff = avg(moodWithSport) - avg(moodWithoutSport)
      if (Math.abs(diff) >= 0.3) {
        newInsights.push({
          emoji: '🏋️', positive: diff > 0,
          text: `Les jours avec sport, ton mood est ${diff > 0 ? 'supérieur' : 'inférieur'}`,
          delta: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt`,
        })
      }
    }

    // 2. Sleep → Mood (next day)
    const shortSleepMood: number[] = []
    const longSleepMood: number[] = []
    for (const [date, sleep] of Object.entries(sleepByDate)) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextStr = nextDay.toISOString().split('T')[0]
      if (dailyMood[nextStr] !== undefined) {
        if (sleep.duration < 6.5) shortSleepMood.push(dailyMood[nextStr])
        else if (sleep.duration >= 7) longSleepMood.push(dailyMood[nextStr])
      }
    }
    if (shortSleepMood.length >= 3 && longSleepMood.length >= 3) {
      const diff = avg(longSleepMood) - avg(shortSleepMood)
      if (Math.abs(diff) >= 0.3) {
        newInsights.push({
          emoji: '😴', positive: true,
          text: `Quand tu dors +7h, ton mood du lendemain est supérieur`,
          delta: `+${diff.toFixed(1)} pt`,
        })
      }
    }

    // 3. Sleep → Stress
    const shortSleepStress: number[] = []
    const longSleepStress: number[] = []
    for (const [date, sleep] of Object.entries(sleepByDate)) {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextStr = nextDay.toISOString().split('T')[0]
      if (dailyStress[nextStr] !== undefined) {
        if (sleep.duration < 6.5) shortSleepStress.push(dailyStress[nextStr])
        else if (sleep.duration >= 7) longSleepStress.push(dailyStress[nextStr])
      }
    }
    if (shortSleepStress.length >= 3 && longSleepStress.length >= 3) {
      const diff = avg(shortSleepStress) - avg(longSleepStress)
      if (Math.abs(diff) >= 0.3) {
        newInsights.push({
          emoji: '😰', positive: false,
          text: `Quand tu dors moins de 6h30, ton stress augmente`,
          delta: `+${diff.toFixed(1)} pt`,
        })
      }
    }

    // 4. Nutrition → Energy
    const energyEquilibre: number[] = []
    const energyNotEquilibre: number[] = []
    for (const [date, meals] of Object.entries(nutritionByDate)) {
      if (dailyEnergy[date] === undefined) continue
      const hasEquilibre = meals.some((m) => m.quality === 'equilibre')
      if (hasEquilibre) energyEquilibre.push(dailyEnergy[date])
      else energyNotEquilibre.push(dailyEnergy[date])
    }
    if (energyEquilibre.length >= 3 && energyNotEquilibre.length >= 3) {
      const diff = avg(energyEquilibre) - avg(energyNotEquilibre)
      if (Math.abs(diff) >= 0.3) {
        newInsights.push({
          emoji: '🥗', positive: diff > 0,
          text: `Les jours "équilibré", ton énergie est ${diff > 0 ? 'supérieure' : 'inférieure'}`,
          delta: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt`,
        })
      }
    }

    // 5. Sport → Sleep quality
    const sleepAfterSport: number[] = []
    const sleepAfterRest: number[] = []
    for (const [date, sleep] of Object.entries(sleepByDate)) {
      if (sportDates.has(date)) sleepAfterSport.push(sleep.quality)
      else sleepAfterRest.push(sleep.quality)
    }
    if (sleepAfterSport.length >= 3 && sleepAfterRest.length >= 3) {
      const diff = avg(sleepAfterSport) - avg(sleepAfterRest)
      if (Math.abs(diff) >= 0.3) {
        newInsights.push({
          emoji: '🛏️', positive: diff > 0,
          text: `Après un jour de sport, ta qualité de sommeil est ${diff > 0 ? 'meilleure' : 'moins bonne'}`,
          delta: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pt`,
        })
      }
    }

    // 6. Stress → Nutrition
    const highStressDates = Object.entries(dailyStress).filter(([, v]) => v >= 4).map(([d]) => d)
    const lowStressDates = Object.entries(dailyStress).filter(([, v]) => v <= 2).map(([d]) => d)
    const highStressEqui = highStressDates.filter((d) => nutritionByDate[d]?.some((m) => m.quality === 'equilibre')).length
    const lowStressEqui = lowStressDates.filter((d) => nutritionByDate[d]?.some((m) => m.quality === 'equilibre')).length
    if (highStressDates.length >= 3 && lowStressDates.length >= 3) {
      const highPct = highStressEqui / highStressDates.length
      const lowPct = lowStressEqui / lowStressDates.length
      const diff = lowPct - highPct
      if (Math.abs(diff) >= 0.15) {
        newInsights.push({
          emoji: '😤', positive: false,
          text: `Quand tu es stressé, tu manges moins équilibré`,
          delta: `${Math.round(diff * 100)}% de diff`,
        })
      }
    }

    setInsights(newInsights)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/analytics')} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-xl">←</button>
          <h1 className="text-3xl font-bold">📊 Dashboard</h1>
        </div>

        {/* ─── WEEK SUMMARY ─── */}
        <Card className="mb-5">
          <h2 className="text-base font-semibold mb-1">Résumé de la semaine</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">7 derniers jours</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Mood */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">🧠 Humeur</p>
              <p className="text-xl font-bold">{weekMood.avg}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{weekMood.count} check-ins</p>
            </div>

            {/* Energy */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">⚡ Énergie</p>
              <p className="text-xl font-bold">{weekMood.energy}</p>
            </div>

            {/* Stress */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">😰 Stress</p>
              <p className="text-xl font-bold">{weekMood.stress}</p>
            </div>

            {/* Sleep */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">😴 Sommeil</p>
              <p className="text-xl font-bold">{weekSleep.avg}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Qualité {weekSleep.quality}/5</p>
            </div>

            {/* Sport */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">🏋️ Sport</p>
              <p className="text-xl font-bold">{weekSport.count}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">séances</p>
            </div>

            {/* Nutrition */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">🥗 Nutrition</p>
              <p className="text-sm font-bold">{weekNutrition.equilibre}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">équilibré</p>
            </div>
          </div>

          {/* Nutrition details */}
          {weekNutrition.count > 0 && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl p-2 text-center">
                <p className="text-sm font-bold text-[var(--accent-blue)]">{weekNutrition.hydrate}</p>
                <p className="text-[9px] text-[var(--text-tertiary)]">💧 hydraté</p>
              </div>
              <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl p-2 text-center">
                <p className="text-sm font-bold text-[var(--accent-red)]">{weekNutrition.protein}</p>
                <p className="text-[9px] text-[var(--text-tertiary)]">🥩 protéines</p>
              </div>
            </div>
          )}
        </Card>

        {/* ─── INSIGHTS ─── */}
        <Card delay={0.1}>
          <h2 className="text-base font-semibold mb-1">💡 Insights personnels</h2>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4">Corrélations sur 30 jours</p>

          {daysOfData < 30 ? (
            <div className="bg-[var(--bg-secondary)] rounded-xl p-5 text-center">
              <p className="text-3xl mb-2">🔒</p>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Encore {30 - daysOfData} jours</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Continue à tracker pour débloquer tes insights personnels</p>
              <div className="w-full bg-[var(--bg-card)] rounded-full h-2 mt-3">
                <div className="bg-[var(--accent-purple)] h-2 rounded-full transition-all" style={{ width: `${Math.round((daysOfData / 30) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{daysOfData}/30 jours</p>
            </div>
          ) : insights.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm text-center">Pas assez de variations pour détecter des corrélations. Continue à tracker !</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{insight.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-[var(--text-primary)]">{insight.text}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        insight.positive
                          ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                          : 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]'
                      }`}>{insight.delta}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
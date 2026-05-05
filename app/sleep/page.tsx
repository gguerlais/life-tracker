'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

const qualities = [
  { score: 1, emoji: '😫', label: 'Horrible' },
  { score: 2, emoji: '😴', label: 'Mauvais' },
  { score: 3, emoji: '😐', label: 'Moyen' },
  { score: 4, emoji: '😌', label: 'Bon' },
  { score: 5, emoji: '🌟', label: 'Excellent' },
]

type SleepLog = {
  id: string
  date: string
  bedtime: string
  wake_time: string
  quality: number
}

function calculateDuration(bedtime: string, wakeTime: string): string {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let totalMin = (wh * 60 + wm) - (bh * 60 + bm)
  if (totalMin < 0) totalMin += 24 * 60
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hours}h${mins.toString().padStart(2, '0')}`
}

export default function SleepPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState(0)
  const [logs, setLogs] = useState<SleepLog[]>([])
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
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(7)
    setLogs(data || [])
  }

  const submitSleep = async () => {
    if (!user || quality === 0) return
    await supabase.from('sleep_logs').insert({
      user_id: user.id, date, bedtime, wake_time: wakeTime, quality,
    })
    setQuality(0)
    loadLogs(user.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">😴 Sommeil</h1>

        <Card className="mb-5">
          <h2 className="text-lg font-semibold mb-5">Enregistrer une nuit</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Coucher</label>
                <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Lever</label>
                <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-2 ml-1">Qualité</label>
              <div className="flex justify-between">
                {qualities.map((q) => (
                  <motion.button
                    key={q.score}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setQuality(q.score)}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-200 ${
                      quality === q.score
                        ? 'bg-[var(--accent-blue)]/20 ring-1 ring-[var(--accent-blue)]'
                        : 'hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <span className="text-2xl">{q.emoji}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-1">{q.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-[var(--text-tertiary)]">Durée estimée : </span>
              <span className="text-lg font-bold bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] bg-clip-text text-transparent">
                {calculateDuration(bedtime, wakeTime)}
              </span>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={submitSleep}
              disabled={quality === 0}
              className="w-full bg-[var(--accent-blue)] text-black font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Enregistrer
            </motion.button>
          </div>
        </Card>

        <Card delay={0.1}>
          <h2 className="text-lg font-semibold mb-4">7 dernières nuits</h2>
          {logs.length === 0 ? (
            <p className="text-[var(--text-tertiary)] text-sm">Aucune nuit enregistrée</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between text-sm bg-[var(--bg-secondary)] p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{qualities.find((q) => q.score === log.quality)?.emoji}</span>
                    <span className="text-[var(--text-secondary)]">
                      {new Date(log.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <span className="text-[var(--text-tertiary)] text-xs">
                    {log.bedtime.slice(0, 5)} → {log.wake_time.slice(0, 5)} · {calculateDuration(log.bedtime, log.wake_time)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
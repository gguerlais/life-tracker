'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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
  created_at: string
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
      user_id: user.id,
      date,
      bedtime,
      wake_time: wakeTime,
      quality,
    })
    setQuality(0)
    loadLogs(user.id)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-sm text-gray-500 underline">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Sommeil</h1>
      </div>

      {/* Sleep input */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enregistrer une nuit</h2>

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

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Coucher</label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Lever</label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Qualité</label>
            <div className="flex justify-between">
              {qualities.map((q) => (
                <button
                  key={q.score}
                  onClick={() => setQuality(q.score)}
                  className={`flex flex-col items-center p-2 rounded-lg transition ${
                    quality === q.score ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl">{q.emoji}</span>
                  <span className="text-xs text-gray-500 mt-1">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            Durée estimée : <strong>{calculateDuration(bedtime, wakeTime)}</strong>
          </div>

          <button
            onClick={submitSleep}
            disabled={quality === 0}
            className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-300"
          >
            Enregistrer
          </button>
        </div>
      </div>

      {/* Recent logs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">7 dernières nuits</h2>
        {logs.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune nuit enregistrée</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {qualities.find((q) => q.score === log.quality)?.emoji}
                  </span>
                  <span className="text-gray-600">
                    {new Date(log.date).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <div className="text-gray-500">
                  {log.bedtime.slice(0, 5)} → {log.wake_time.slice(0, 5)} · {calculateDuration(log.bedtime, log.wake_time)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
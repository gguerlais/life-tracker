'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from './components/PageTransition'
import { motion } from 'framer-motion'

// ─── CONSTANTS ───

const modules = [
  { path: '/mood', emoji: '🧠', label: 'Mood', desc: 'Comment tu te sens ?', gradient: 'from-purple-500/20 to-pink-500/20', border: 'hover:border-purple-500/50' },
  { path: '/sleep', emoji: '😴', label: 'Sommeil', desc: 'Logge ta nuit', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'hover:border-blue-500/50' },
  { path: '/nutrition', emoji: '🥗', label: 'Nutrition', desc: 'Enregistre un repas', gradient: 'from-orange-500/20 to-yellow-500/20', border: 'hover:border-orange-500/50' },
  { path: '/sport', emoji: '🏋️', label: 'Sport', desc: 'Logge une séance', gradient: 'from-red-500/20 to-orange-500/20', border: 'hover:border-red-500/50' },
  { path: '/learning', emoji: '📚', label: 'Apprentissage', desc: "Session d'étude", gradient: 'from-indigo-500/20 to-blue-500/20', border: 'hover:border-indigo-500/50' },
  { path: '/analytics', emoji: '📊', label: 'Analytics', desc: 'Tes tendances', gradient: 'from-green-500/20 to-emerald-500/20', border: 'hover:border-green-500/50' },
]

// ─── TYPES ───

type Event = {
  id: string
  name: string
  emoji: string
  date: string
  note: string | null
}

// ─── HELPERS ───

const getCountdown = (dateStr: string) => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { days: diffDays, label: `+${Math.abs(diffDays)}j`, passed: true }
  if (diffDays === 0) return { days: 0, label: "Aujourd'hui !", passed: false }
  if (diffDays === 1) return { days: 1, label: 'Demain', passed: false }
  if (diffDays < 30) return { days: diffDays, label: `J-${diffDays}`, passed: false }

  const months = Math.floor(diffDays / 30)
  const remainDays = diffDays % 30
  if (remainDays === 0) return { days: diffDays, label: `${months} mois`, passed: false }
  return { days: diffDays, label: `${months}m ${remainDays}j`, passed: false }
}

const getUrgencyColor = (days: number) => {
  if (days <= 7) return 'text-[var(--accent-red)]'
  if (days <= 30) return 'text-[var(--accent-orange)]'
  return 'text-[var(--accent-green)]'
}

// ─── COMPONENT ───

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventName, setEventName] = useState('')
  const [eventEmoji, setEventEmoji] = useState('🎯')
  const [eventDate, setEventDate] = useState('')
  const [eventNote, setEventNote] = useState('')

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login') } else {
        setUser(user)
        loadEvents(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadEvents = async (userId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5)
    setEvents(data || [])
  }

  const submitEvent = async () => {
    if (!user || !eventName || !eventDate) return
    await supabase.from('events').insert({
      user_id: user.id,
      name: eventName,
      emoji: eventEmoji,
      date: eventDate,
      note: eventNote || null,
    })
    setEventName('')
    setEventEmoji('🎯')
    setEventDate('')
    setEventNote('')
    setShowEventForm(false)
    loadEvents(user.id)
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    if (user) loadEvents(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[var(--accent-purple)] border-t-transparent rounded-full" />
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const emojiOptions = ['🎯', '🚴', '🏋️', '🏃', '📅', '🎓', '✈️', '🏆', '💼', '🎉', '⏰', '🔥']

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <div className="flex justify-between items-center mb-10">
          <div>
            <p className="text-[var(--text-tertiary)] text-sm">{greeting} 👋</p>
            <h1 className="text-3xl font-bold mt-1">Life Tracker</h1>
          </div>
          <button onClick={handleLogout}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--text-tertiary)]"
          >Déconnexion</button>
        </div>

        {/* ─── MODULES ─── */}
        <div className="grid grid-cols-2 gap-4">
          {modules.map((item, i) => (
            <motion.button key={item.path}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => router.push(item.path)}
              className={`bg-gradient-to-br ${item.gradient} bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)] ${item.border} transition-all duration-300 text-left hover:scale-[1.02] active:scale-[0.98]`}
            >
              <span className="text-3xl">{item.emoji}</span>
              <p className="font-semibold mt-3 text-[var(--text-primary)]">{item.label}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{item.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* ─── ÉCHÉANCES ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">⏳ Échéances</h2>
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="text-xs text-[var(--accent-purple)] hover:underline"
            >{showEventForm ? 'Annuler' : '+ Ajouter'}</button>
          </div>

          {showEventForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-3 space-y-3"
            >
              <div className="flex flex-wrap gap-1.5">
                {emojiOptions.map((e) => (
                  <button key={e} onClick={() => setEventEmoji(e)}
                    className={`text-lg p-1.5 rounded-lg transition-all ${eventEmoji === e ? 'bg-[var(--accent-purple)]/20 ring-1 ring-[var(--accent-purple)]' : ''}`}
                  >{e}</button>
                ))}
              </div>
              <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Nom de l'échéance" className="w-full p-3 rounded-xl text-sm" />
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
              <input type="text" value={eventNote} onChange={(e) => setEventNote(e.target.value)} placeholder="Note (optionnel)" className="w-full p-3 rounded-xl text-sm" />
              <motion.button whileTap={{ scale: 0.97 }} onClick={submitEvent} disabled={!eventName || !eventDate}
                className="w-full bg-[var(--accent-purple)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
              >Ajouter</motion.button>
            </motion.div>
          )}

          {events.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-3">Aucune échéance à venir</p>
          ) : (
            <div className="space-y-2">
              {events.map((event, i) => {
                const countdown = getCountdown(event.date)
                return (
                  <motion.div key={event.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{event.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{event.name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold ${getUrgencyColor(countdown.days)}`}>{countdown.label}</p>
                      <button onClick={() => deleteEvent(event.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs ml-1">✕</button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  )
}
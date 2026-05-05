'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import PageTransition from '../components/PageTransition'
import Card from '../components/Card'
import { motion } from 'framer-motion'

type Topic = {
  id: string
  name: string
  description: string | null
  status: string
  created_at: string
}

type LearningSession = {
  id: string
  topic_id: string
  date: string
  duration_min: number
  notes: string | null
  created_at: string
  learning_topics: { name: string } | null
}

export default function LearningPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [sessions, setSessions] = useState<LearningSession[]>([])

  const [topicName, setTopicName] = useState('')
  const [topicDesc, setTopicDesc] = useState('')

  const [sessionTopicId, setSessionTopicId] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionDuration, setSessionDuration] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')

  const [activeTab, setActiveTab] = useState<'session' | 'topics'>('session')

  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadTopics(user.id)
        loadSessions(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadTopics = async (userId: string) => {
    const { data } = await supabase.from('learning_topics').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setTopics(data || [])
  }

  const loadSessions = async (userId: string) => {
    const { data } = await supabase.from('learning_sessions').select('*, learning_topics ( name )').eq('user_id', userId).order('date', { ascending: false }).limit(10)
    setSessions(data || [])
  }

  const addTopic = async () => {
    if (!user || !topicName) return
    await supabase.from('learning_topics').insert({ user_id: user.id, name: topicName, description: topicDesc || null })
    setTopicName('')
    setTopicDesc('')
    loadTopics(user.id)
  }

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    await supabase.from('learning_topics').update({ status: newStatus }).eq('id', topicId)
    if (user) loadTopics(user.id)
  }

  const submitSession = async () => {
    if (!user || !sessionTopicId || !sessionDuration) return
    await supabase.from('learning_sessions').insert({
      user_id: user.id, topic_id: sessionTopicId, date: sessionDate, duration_min: parseInt(sessionDuration), notes: sessionNotes || null,
    })
    setSessionTopicId('')
    setSessionDuration('')
    setSessionNotes('')
    loadSessions(user.id)
  }

  const deleteSession = async (id: string) => {
    await supabase.from('learning_sessions').delete().eq('id', id)
    if (user) loadSessions(user.id)
  }

  const deleteTopic = async (id: string) => {
    await supabase.from('learning_topics').delete().eq('id', id)
    if (user) {
      loadTopics(user.id)
      loadSessions(user.id)
    }
  }

  const totalTimeByTopic = (topicId: string) => {
    return sessions.filter((s) => s.topic_id === topicId).reduce((sum, s) => sum + s.duration_min, 0)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  const activeTopics = topics.filter((t) => t.status === 'active')
  const backlogTopics = topics.filter((t) => t.status === 'backlog')
  const doneTopics = topics.filter((t) => t.status === 'done')

  return (
    <PageTransition>
      <div className="min-h-screen p-5 max-w-lg mx-auto pb-28">
        <h1 className="text-3xl font-bold mb-8">📚 Apprentissage</h1>

        <div className="flex gap-2 mb-6">
          {(['session', 'topics'] as const).map((tab) => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[var(--accent-purple)] text-white'
                  : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {tab === 'session' ? "📝 Session d'étude" : '📚 Sujets'}
            </motion.button>
          ))}
        </div>

        {activeTab === 'session' && (
          <>
            <Card className="mb-5">
              <h2 className="text-lg font-semibold mb-5">Nouvelle session</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Sujet</label>
                  <select value={sessionTopicId} onChange={(e) => setSessionTopicId(e.target.value)} className="w-full p-3 rounded-xl text-sm">
                    <option value="">-- Choisir un sujet --</option>
                    {topics.filter((t) => t.status !== 'done').map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Date</label>
                    <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-tertiary)] mb-1.5 ml-1">Durée (min)</label>
                    <input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} placeholder="30" className="w-full p-3 rounded-xl text-sm" />
                  </div>
                </div>

                <input type="text" placeholder="Notes (optionnel)" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} className="w-full p-3 rounded-xl text-sm" />

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submitSession}
                  disabled={!sessionTopicId || !sessionDuration}
                  className="w-full bg-[var(--accent-purple)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                  Enregistrer
                </motion.button>
              </div>
            </Card>

            <Card delay={0.1}>
              <h2 className="text-lg font-semibold mb-4">Dernières sessions</h2>
              {sessions.length === 0 ? (
                <p className="text-[var(--text-tertiary)] text-sm">Aucune session enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between text-sm bg-[var(--bg-secondary)] p-3 rounded-xl"
                    >
                      <div>
                        <span className="font-medium">{s.learning_topics?.name}</span>
                        {s.notes && <p className="text-[11px] text-[var(--text-tertiary)]">{s.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-[var(--text-tertiary)] text-xs">
                          <div>{s.duration_min} min</div>
                          <div>{new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <button onClick={() => deleteSession(s.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {activeTab === 'topics' && (
          <>
            <Card className="mb-5">
              <h2 className="text-lg font-semibold mb-4">Nouveau sujet</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Nom du sujet" value={topicName} onChange={(e) => setTopicName(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                <input type="text" placeholder="Description (optionnel)" value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} className="w-full p-3 rounded-xl text-sm" />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={addTopic}
                  disabled={!topicName}
                  className="w-full bg-[var(--accent-purple)] text-white font-medium p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
                >
                  Ajouter
                </motion.button>
              </div>
            </Card>

            {[
              { title: '🔥 En cours', items: activeTopics },
              { title: '📋 À explorer', items: backlogTopics },
              { title: '✅ Maîtrisé', items: doneTopics },
            ].map((group, gi) => (
              <Card key={group.title} className="mb-4" delay={gi * 0.1}>
                <h2 className="text-lg font-semibold mb-3">{group.title}</h2>
                {group.items.length === 0 ? (
                  <p className="text-[var(--text-tertiary)] text-sm">Aucun sujet</p>
                ) : (
                  <div className="space-y-3">
                    {group.items.map((topic, i) => (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-[var(--bg-secondary)] p-4 rounded-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">{topic.name}</span>
                            {topic.description && <p className="text-[11px] text-[var(--text-tertiary)]">{topic.description}</p>}
                            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">⏱ {totalTimeByTopic(topic.id)} min</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={topic.status}
                              onChange={(e) => updateTopicStatus(topic.id, e.target.value)}
                              className="text-xs rounded-lg p-1.5"
                            >
                              <option value="backlog">À explorer</option>
                              <option value="active">En cours</option>
                              <option value="done">Maîtrisé</option>
                            </select>
                            <button onClick={() => deleteTopic(topic.id)} className="text-[var(--accent-red)]/50 hover:text-[var(--accent-red)] text-xs transition-colors">✕</button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </>
        )}
      </div>
    </PageTransition>
  )
}
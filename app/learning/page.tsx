'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

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

const statuses = [
  { value: 'backlog', label: '📋 À explorer', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: '🔥 En cours', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: '✅ Maîtrisé', color: 'bg-green-100 text-green-700' },
]

export default function LearningPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [topics, setTopics] = useState<Topic[]>([])
  const [sessions, setSessions] = useState<LearningSession[]>([])

  // New topic
  const [topicName, setTopicName] = useState('')
  const [topicDesc, setTopicDesc] = useState('')

  // New session
  const [sessionTopicId, setSessionTopicId] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionDuration, setSessionDuration] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')

  // View
  const [activeTab, setActiveTab] = useState<'topics' | 'session'>('session')

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
    const { data } = await supabase
      .from('learning_topics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setTopics(data || [])
  }

  const loadSessions = async (userId: string) => {
    const { data } = await supabase
      .from('learning_sessions')
      .select('*, learning_topics ( name )')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10)
    setSessions(data || [])
  }

  const addTopic = async () => {
    if (!user || !topicName) return
    await supabase.from('learning_topics').insert({
      user_id: user.id,
      name: topicName,
      description: topicDesc || null,
    })
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
      user_id: user.id,
      topic_id: sessionTopicId,
      date: sessionDate,
      duration_min: parseInt(sessionDuration),
      notes: sessionNotes || null,
    })
    setSessionTopicId('')
    setSessionDuration('')
    setSessionNotes('')
    loadSessions(user.id)
  }

  // Calcul temps total par topic
  const totalTimeByTopic = (topicId: string) => {
    return sessions
      .filter((s) => s.topic_id === topicId)
      .reduce((sum, s) => sum + s.duration_min, 0)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  const activeTopics = topics.filter((t) => t.status === 'active')
  const backlogTopics = topics.filter((t) => t.status === 'backlog')
  const doneTopics = topics.filter((t) => t.status === 'done')

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/')} className="text-sm text-gray-500 underline">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Apprentissage</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('session')}
          className={`flex-1 p-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'session' ? 'bg-black text-white' : 'bg-white border hover:bg-gray-100'
          }`}
        >
          📝 Session d&apos;étude
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`flex-1 p-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'topics' ? 'bg-black text-white' : 'bg-white border hover:bg-gray-100'
          }`}
        >
          📚 Sujets
        </button>
      </div>

      {activeTab === 'session' && (
        <>
          {/* New session */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle session</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sujet</label>
                <select
                  value={sessionTopicId}
                  onChange={(e) => setSessionTopicId(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">-- Choisir un sujet --</option>
                  {topics.filter((t) => t.status !== 'done').map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Date</label>
                  <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Durée (min)</label>
                  <input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} placeholder="30" className="w-full p-2 border rounded" />
                </div>
              </div>

              <input
                type="text"
                placeholder="Notes (optionnel)"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />

              <button
                onClick={submitSession}
                disabled={!sessionTopicId || !sessionDuration}
                className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-300"
              >
                Enregistrer
              </button>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Dernières sessions</h2>
            {sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune session enregistrée</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <div>
                      <span className="font-medium">{s.learning_topics?.name}</span>
                      {s.notes && <p className="text-xs text-gray-500">{s.notes}</p>}
                    </div>
                    <div className="text-right text-gray-500 text-xs">
                      <div>{s.duration_min} min</div>
                      <div>
                        {new Date(s.date).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'topics' && (
        <>
          {/* New topic */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouveau sujet</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nom du sujet"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={topicDesc}
                onChange={(e) => setTopicDesc(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <button
                onClick={addTopic}
                disabled={!topicName}
                className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 disabled:bg-gray-300"
              >
                Ajouter
              </button>
            </div>
          </div>

          {/* Topics by status */}
          {[
            { title: '🔥 En cours', items: activeTopics },
            { title: '📋 À explorer', items: backlogTopics },
            { title: '✅ Maîtrisé', items: doneTopics },
          ].map((group) => (
            <div key={group.title} className="bg-white rounded-lg shadow p-6 mb-4">
              <h2 className="text-lg font-semibold mb-3">{group.title}</h2>
              {group.items.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun sujet</p>
              ) : (
                <div className="space-y-3">
                  {group.items.map((topic) => (
                    <div key={topic.id} className="border-b pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{topic.name}</span>
                          {topic.description && (
                            <p className="text-xs text-gray-500">{topic.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            ⏱ {totalTimeByTopic(topic.id)} min au total
                          </p>
                        </div>
                        <select
                          value={topic.status}
                          onChange={(e) => updateTopicStatus(topic.id, e.target.value)}
                          className="text-xs border rounded p-1"
                        >
                          <option value="backlog">À explorer</option>
                          <option value="active">En cours</option>
                          <option value="done">Maîtrisé</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
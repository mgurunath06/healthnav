import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import Header from './Header'
import ProfileSelector from './ProfileSelector'
import { apiFetch } from '../lib/api'

export default function ChatScreen() {
  const { getToken } = useAuth()
  const [profileId, setProfileId] = useState('')
  const [conversations, setConversations] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadConversations() {
    const token = await getToken()
    setConversations(await apiFetch('/chat', { token }))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations().catch(() => setConversations([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openConversation(id) {
    const token = await getToken()
    const data = await apiFetch(`/chat/${id}`, { token })
    setConversationId(data.conversation_id)
    setProfileId(data.profile_id ?? '')
    setMessages(data.messages ?? [])
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setMessages((rows) => [...rows, { role: 'user', content: text, disclaimer_shown: false }])
    try {
      const token = await getToken()
      const data = await apiFetch('/chat', {
        token,
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          profile_id: profileId || null,
        }),
      })
      setConversationId(data.conversation_id)
      setMessages((rows) => [
        ...rows,
        { role: 'assistant', content: data.reply, disclaimer_shown: data.disclaimer_shown },
      ])
      await loadConversations()
    } catch {
      setMessages((rows) => [
        ...rows,
        { role: 'assistant', content: 'I could not respond just now. Please try again.', disclaimer_shown: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="min-h-dvh bg-warm-charcoal flex flex-col">
      <Header />
      <main className="flex-1 min-h-0 grid md:grid-cols-[16rem_1fr]">
        <aside className="border-b md:border-b-0 md:border-r border-warm-border p-4 space-y-4 overflow-y-auto">
          <Link to="/dashboard" className="font-sans text-sm text-warm-muted hover:text-warm-off-white">
            Back to dashboard
          </Link>
          <button
            onClick={() => { setConversationId(null); setMessages([]) }}
            className="w-full px-4 py-2 rounded border border-accent text-accent font-sans text-sm"
          >
            New chat
          </button>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => openConversation(conv.conversation_id)}
                className={`w-full text-left px-3 py-2 rounded border font-sans text-sm transition-colors duration-250 ${
                  conv.conversation_id === conversationId
                    ? 'border-accent text-warm-off-white bg-accent/10'
                    : 'border-warm-border text-warm-muted bg-warm-surface hover:text-warm-off-white'
                }`}
              >
                <span className="block truncate">{conv.title}</span>
                <span className="font-mono text-xs text-warm-muted">{formatDate(conv.updated_at)}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-0 flex flex-col">
          <div className="border-b border-warm-border p-4">
            <div className="max-w-3xl mx-auto">
              <ProfileSelector value={profileId} onChange={setProfileId} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <p className="font-serif text-2xl text-warm-off-white font-light">
                  Ask about your records, routines, or what to discuss with your doctor.
                </p>
              ) : (
                messages.map((message, i) => <MessageBlock key={i} message={message} />)
              )}
              {loading && <p className="font-sans text-sm text-warm-muted animate-agent-trace-pulse">HealthNav is reviewing your context...</p>}
            </div>
          </div>

          <div className="border-t border-warm-border p-4">
            <div className="max-w-3xl mx-auto flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={onKeyDown}
                rows={2}
                placeholder="Ask a wellness question..."
                className="flex-1 resize-none rounded bg-warm-surface border border-warm-border text-warm-off-white placeholder-warm-muted font-sans text-sm px-4 py-3 outline-none focus:border-accent"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="self-end px-5 py-3 rounded bg-accent text-warm-off-white font-sans text-sm disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function MessageBlock({ message }) {
  const assistant = message.role === 'assistant'
  return (
    <div className={`flex ${assistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded px-5 py-4 border border-warm-border ${assistant ? 'bg-warm-elevated' : 'bg-warm-surface'}`}>
        <p className={`${assistant ? 'font-serif text-base' : 'font-sans text-sm'} text-warm-off-white leading-relaxed whitespace-pre-wrap`}>
          {message.content}
        </p>
        {message.disclaimer_shown && (
          <p className="font-sans text-xs text-warm-muted italic mt-3">
            This is general wellness information - not medical advice. Please discuss with your doctor.
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

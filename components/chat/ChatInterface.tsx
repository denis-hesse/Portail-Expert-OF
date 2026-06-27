'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Message } from '@/lib/types'
import ReactMarkdown from 'react-markdown'

interface Props { conversationId?: string }

export default function ChatInterface({ conversationId }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState(conversationId)
  const [loadingPhase, setLoadingPhase] = useState<'phase1' | 'phase2' | 'conversational' | null>(null)
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastResponseRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function cleanContent(text: string): string {
    return text
      .split('\n')
      .filter((line) => !/^\s*-{3,}\s*$/.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  useEffect(() => {
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}`)
        .then((r) => r.json())
        .then((data) => {
          const msgs: Message[] = data.messages ?? []
          setMessages(msgs)
        })
    }
  }, [conversationId])

  useEffect(() => {
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role === 'assistant') {
      lastResponseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  async function handleTokenCount() {
    setLoading(true)
    const convMessages = messages.map((m) => ({ role: m.role, content: m.content }))
    try {
      const res = await fetch('/api/chat/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convMessages, conversationId: convId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Tokens en entrée : ${data.inputTokens.toLocaleString('fr-FR')}\nMessages : ${data.conversationMessages}\nCoût estimé : ~${((data.inputTokens / 1_000_000) * 3).toFixed(4)} $`,
        },
      ])
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erreur tokens : ${err?.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function isConversational(question: string): boolean {
    if (messages.length === 0) return false
    const q = question.toLowerCase().trim()
    return /^(reformule|raccourcis|traduis|simplifie|mets en forme|reformat)/.test(q)
      || /^(résume|synthétise|développe|explique autrement)\s+(en\b|ça|cela|cette|ce texte|la réponse|tout ça)/.test(q)
      || /^plus (court|long|simple|détaillé|concis)/.test(q)
      || /\ben \d+ (mots|points|lignes|bullet|étapes)\b/.test(q)
      || /autrement dit/.test(q)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    if (trimmed === '/tk') { setInput(''); await handleTokenCount(); return }

    const question = trimmed
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    if (isConversational(question)) {
      setLoadingPhase('conversational')
    } else {
      setLoadingPhase('phase1')
      phaseTimerRef.current = setTimeout(() => setLoadingPhase('phase2'), 8000)
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, conversationId: convId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.synthesis, citedFiches: data.citedFiches },
      ])

      if (!convId && data.conversationId) {
        setConvId(data.conversationId)
        router.replace(`/dashboard/chat/${data.conversationId}`)
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erreur : ${err?.message ?? 'Une erreur est survenue.'}` },
      ])
    } finally {
      setLoading(false)
      setLoadingPhase(null)
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current)
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Zone principale Q&R */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg-main)' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
            Questions &amp; Réponses
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
          {messages.length === 0 && (
            <div className="text-center" style={{ marginTop: 60 }}>
              <p style={{ fontSize: 28, marginBottom: 12 }}>💬</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Posez votre question sur le CPF, les RS ou le RNCP</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1
            return (
              <div key={i} style={{ marginBottom: 16 }} ref={isLastAssistant ? lastResponseRef : undefined}>
                {msg.role === 'user' ? (
                  <div
                    style={{
                      display: 'inline-block',
                      background: 'var(--accent-light)',
                      borderRadius: 10,
                      padding: '8px 14px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      maxWidth: '85%',
                      fontWeight: 500,
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.65,
                    }}
                    className="prose-response"
                  >
                    <ReactMarkdown>{cleanContent(msg.content)}</ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
          {loading && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }} className="animate-pulse">
              {loadingPhase === 'phase1' && 'Sélection des fiches concernées…'}
              {loadingPhase === 'phase2' && 'Synthèse des informations & rédaction de la réponse…'}
              {loadingPhase === 'conversational' && "Préparation d'une demande conversationnelle…"}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div
          className="shrink-0"
          style={{
            borderTop: '0.5px solid var(--border)',
            padding: '12px 20px',
            background: 'var(--bg-main)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2" style={{ alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              rows={3}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (!loading && input.trim()) handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Posez votre question…"
              disabled={loading}
              style={{
                flex: 1,
                border: '0.5px solid #DDDDD8',
                borderRadius: 10,
                padding: '8px 14px',
                fontSize: 14,
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
                opacity: loading ? 0.5 : 1,
                transition: 'border-color 150ms ease',
                resize: 'none',
                lineHeight: 1.55,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#DDDDD8' }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: 'var(--accent-light)',
                color: 'var(--text-link)',
                border: 'none',
                borderRadius: 16,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 500,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                transition: 'background 150ms ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (!loading && input.trim()) (e.currentTarget as HTMLElement).style.background = '#E8E8E4' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
            >
              Envoyer
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}

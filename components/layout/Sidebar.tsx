'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, FileText, BookOpen, Settings, LogOut } from 'lucide-react'

interface ConvSummary { id: string; title: string; updated_at: string }

const navItems = [
  { href: '/dashboard/chat',     label: 'Questions & réponses',  Icon: MessageSquare },
  { href: '/dashboard/reports',  label: 'Rapports de veille',    Icon: FileText },
  { href: '/dashboard/fiches',   label: 'Base de connaissance',  Icon: BookOpen },
  { href: '/dashboard/settings', label: 'Paramètres',            Icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [conversations, setConversations] = useState<ConvSummary[]>([])

  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch('/api/conversations')
      const data = await r.json()
      setConversations(data ?? [])
    } catch {}
  }, [])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  useEffect(() => {
    if (!pathname.startsWith('/dashboard/chat')) return
    fetchConversations()
  }, [pathname, fetchConversations])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteConv(e: React.MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (pathname === `/dashboard/chat/${id}`) router.push('/dashboard/chat')
  }

  const currentConvId = pathname.startsWith('/dashboard/chat/')
    ? pathname.split('/dashboard/chat/')[1]
    : undefined

  function formatDate(iso: string) {
    const d = new Date(iso)
    const weekday = d.toLocaleDateString('fr-FR', { weekday: 'long' })
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${date} · ${time}`
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-full overflow-hidden"
      style={{ width: 258, background: 'var(--bg-sidebar)', borderRight: '0.5px solid var(--border)' }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 16px 16px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          Expert certification de la formation
        </span>
      </div>

      {/* Nav */}
      <nav style={{ padding: '0 0 4px', flexShrink: 0 }}>
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 transition-colors"
              style={{
                margin: '1px 8px',
                padding: '8px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-light)' : 'transparent',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Icon size={15} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Séparateur */}
      <div style={{ margin: '10px 16px', borderTop: '1px solid var(--border-light)', flexShrink: 0 }} />

      {/* Section conversations */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between shrink-0" style={{ padding: '0 16px', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Conversations
          </span>
          <Link
            href="/dashboard/chat"
            style={{ fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            + Nouveau
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 4 }}>
          {conversations.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 16px' }}>Aucune conversation.</p>
          )}
          {conversations.map((conv) => {
            const active = conv.id === currentConvId
            return (
              <div
                key={conv.id}
                className="group relative"
                style={{
                  margin: '1px 8px',
                  borderRadius: 6,
                  background: active ? 'var(--accent-light)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Link href={`/dashboard/chat/${conv.id}`} className="block" style={{ padding: '6px 14px', textDecoration: 'none', overflow: 'hidden' }}>
                  <p style={{
                    fontSize: 14,
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: active ? 500 : 400,
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    width: '100%',
                  } as React.CSSProperties}>{conv.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(conv.updated_at)}
                  </p>
                </Link>
                <button
                  onClick={(e) => deleteConv(e, conv.id)}
                  className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  title="Supprimer"
                >✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Déconnexion */}
      <div style={{ padding: '8px 0', borderTop: '0.5px solid var(--border)', flexShrink: 0 }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full"
          style={{ padding: '8px 16px', fontSize: 12, color: '#AAAAAA', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'color 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#AAAAAA' }}
        >
          <LogOut size={13} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

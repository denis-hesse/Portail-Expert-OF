'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Fiche } from '@/lib/types'

function stripSourcesSection(content: string): string {
  return content.replace(/\n*#{0,3}\s*SOURCES\b[\s\S]*$/i, '').trim()
}

export default function FicheDetail({ id }: { id: string }) {
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/fiches/${id}`)
      .then((r) => r.json())
      .then((data) => { setFiche(data); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</div>
  if (!fiche) return <div style={{ padding: 24, fontSize: 13, color: '#CC4444' }}>Fiche introuvable.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)' }}>
      {/* Topbar */}
      <div style={{ height: 44, borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
        <Link
          href="/dashboard/fiches"
          style={{ fontSize: 13, color: 'var(--text-link)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
        >
          ← Base de connaissance
        </Link>
        <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fiche.title}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', maxWidth: 720 }}>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {fiche.domain && (
            <span style={{ fontSize: 11, background: 'var(--bg-app)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 20, border: '0.5px solid var(--border)' }}>
              {fiche.domain}
            </span>
          )}
          {fiche.theme && (
            <span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20 }}>
              {fiche.theme}
            </span>
          )}
          {fiche.subtheme && (
            <span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20, opacity: 0.75 }}>
              {fiche.subtheme}
            </span>
          )}
        </div>

        {/* Résumé */}
        {fiche.summary && (
          <div style={{ background: 'var(--accent-light)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Résumé</p>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }} className="prose-response">
              <ReactMarkdown>{fiche.summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Contenu */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }} className="prose-response">
          <ReactMarkdown>{stripSourcesSection(fiche.content)}</ReactMarkdown>
        </div>

        {/* Sources */}
        {fiche.sources.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Sources</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {fiche.sources.map((s, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  •{' '}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)', textDecoration: 'none' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}>
                      {s.name || s.url}
                    </a>
                  ) : (
                    s.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Textes réglementaires */}
        {fiche.regulatoryTexts.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Textes réglementaires</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {fiche.regulatoryTexts.map((t, i) => (
                <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>• {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

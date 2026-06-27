'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Fiche } from '@/lib/types'

export default function FichesList() {
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [filterTheme, setFilterTheme] = useState('')
  const [filterSubtheme, setFilterSubtheme] = useState('')

  useEffect(() => {
    fetch('/api/fiches')
      .then((r) => r.json())
      .then((data) => { setFiches(data); setLoading(false) })
  }, [])

  const domains = Array.from(new Set(fiches.map((f) => f.domain).filter(Boolean)))
  const themes = Array.from(new Set(fiches.filter((f) => !filterDomain || f.domain === filterDomain).map((f) => f.theme).filter(Boolean)))
  const subthemes = Array.from(new Set(fiches.filter((f) => !filterTheme || f.theme === filterTheme).map((f) => f.subtheme).filter(Boolean)))

  const filtered = fiches.filter((f) => {
    const matchSearch = !search || f.title.toLowerCase().includes(search.toLowerCase()) || f.summary.toLowerCase().includes(search.toLowerCase())
    const matchDomain = !filterDomain || f.domain === filterDomain
    const matchTheme = !filterTheme || f.theme === filterTheme
    const matchSubtheme = !filterSubtheme || f.subtheme === filterSubtheme
    return matchSearch && matchDomain && matchTheme && matchSubtheme
  })

  const selectStyle: React.CSSProperties = {
    border: '0.5px solid var(--border)',
    borderRadius: 6,
    padding: '7px 12px',
    fontSize: 12,
    color: 'var(--text-primary)',
    background: 'var(--bg-main)',
    outline: 'none',
    cursor: 'pointer',
  }

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p>

  return (
    <div>
      {/* Filtres */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche par mot-clé…"
          style={{
            ...selectStyle,
            width: 220,
            fontStyle: 'italic',
            fontWeight: 300,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        <select value={filterDomain} onChange={(e) => { setFilterDomain(e.target.value); setFilterTheme(''); setFilterSubtheme('') }} style={selectStyle}>
          <option value="">Tous les domaines</option>
          {domains.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterTheme} onChange={(e) => { setFilterTheme(e.target.value); setFilterSubtheme('') }} style={selectStyle}>
          <option value="">Tous les thèmes</option>
          {themes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterSubtheme} onChange={(e) => setFilterSubtheme(e.target.value)} style={selectStyle}>
          <option value="">Tous les sous-thèmes</option>
          {subthemes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
        {filtered.length} fiche{filtered.length !== 1 ? 's' : ''}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 700 }}>
        {filtered.map((fiche) => (
          <Link
            key={fiche.id}
            href={`/dashboard/fiches/${fiche.id}`}
            style={{
              display: 'block',
              padding: '12px 16px',
              borderRadius: 10,
              border: '0.5px solid var(--border)',
              background: 'var(--bg-main)',
              textDecoration: 'none',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-main)' }}
          >
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: fiche.summary ? 4 : 0 }}>
              {fiche.title}
            </p>
            {fiche.summary && (
              <p style={{
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              } as React.CSSProperties}>
                {fiche.summary}
              </p>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
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
          </Link>
        ))}
      </div>
    </div>
  )
}

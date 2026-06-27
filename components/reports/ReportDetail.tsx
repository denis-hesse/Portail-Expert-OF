'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Report } from '@/lib/types'

export default function ReportDetail({ id }: { id: string }) {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((data) => { setReport(data); setLoading(false) })
  }, [id])

  if (loading) return <div style={{ padding: 24, fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</div>
  if (!report) return <div style={{ padding: 24, fontSize: 13, color: '#CC4444' }}>Rapport introuvable.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)' }}>
      {/* Topbar */}
      <div style={{ height: 44, borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
        <Link
          href="/dashboard/reports"
          style={{ fontSize: 13, color: 'var(--text-link)', textDecoration: 'none' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
        >
          ← Rapports
        </Link>
        <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {report.title}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>
          {new Date(report.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-wrap', maxWidth: 680 }}>
          {report.content}
        </div>
      </div>
    </div>
  )
}

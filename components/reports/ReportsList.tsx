'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Report } from '@/lib/types'

const LAST_VISIT_KEY = 'reports_last_visit'

export default function ReportsList() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [lastVisit, setLastVisit] = useState<Date | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_VISIT_KEY)
    if (stored) setLastVisit(new Date(stored))
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString())
    fetch('/api/reports')
      .then((r) => r.json())
      .then((data) => { setReports(data); setLoading(false) })
  }, [])

  if (loading) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p>
  if (!reports.length) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun rapport disponible.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 680 }}>
      {reports.map((report) => {
        const isNew = lastVisit ? new Date(report.date) > lastVisit : false
        return (
          <Link
            key={report.id}
            href={`/dashboard/reports/${report.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {report.title}
                </p>
                {isNew && (
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 500, background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 20 }}>
                    Nouveau
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {new Date(report.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: 13 }}>→</span>
          </Link>
        )
      })}
    </div>
  )
}

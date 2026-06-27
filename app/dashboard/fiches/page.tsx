import FichesList from '@/components/fiches/FichesList'

export default function FichesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)' }}>
      <div style={{ height: 44, borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Base de connaissance</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <FichesList />
      </div>
    </div>
  )
}

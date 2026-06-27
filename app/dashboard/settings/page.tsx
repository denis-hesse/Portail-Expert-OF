'use client'

import { useTheme } from '@/components/theme/ThemeProvider'
import { Sun, Moon, Monitor } from 'lucide-react'

type Option = { value: 'light' | 'dark' | 'system'; label: string; desc: string; Icon: React.ElementType }

const options: Option[] = [
  { value: 'light',  label: 'Mode clair',   desc: 'Interface toujours en mode clair',   Icon: Sun },
  { value: 'dark',   label: 'Mode sombre',  desc: 'Interface toujours en mode sombre',  Icon: Moon },
  { value: 'system', label: 'Mode système', desc: 'Suit le réglage de votre système',   Icon: Monitor },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)' }}>
      {/* Topbar */}
      <div style={{ height: 44, borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', flexShrink: 0 }}>
        <span style={{ fontSize: 15, color: 'var(--accent)' }}>⚙</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Paramètres</span>
      </div>

      <div style={{ padding: '24px 24px', overflowY: 'auto', flex: 1 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          Apparence
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
          {options.map(({ value, label, desc, Icon }) => {
            const active = theme === value
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: active ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
                  background: active ? 'var(--accent-light)' : 'var(--bg-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)' }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-main)' }}
              >
                <Icon size={18} style={{ color: active ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? 'var(--accent)' : 'var(--text-primary)', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>{desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

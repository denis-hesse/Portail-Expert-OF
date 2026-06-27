import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/theme/ThemeProvider'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Expert CPF – Portail',
  description: 'Portail expert CPF, RS et RNCP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={dmSans.className} style={{ WebkitFontSmoothing: 'antialiased' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

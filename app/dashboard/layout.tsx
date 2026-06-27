import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-app)' }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  )
}

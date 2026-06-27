'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        if (session) {
          router.replace('/accept-invite')
        }
      }
    })

    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/accept-invite')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-sm text-gray-500">Vérification en cours…</p>
      </div>
    </div>
  )
}

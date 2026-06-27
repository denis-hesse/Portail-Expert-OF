'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Écouter SIGNED_IN au cas où la session arrive après le rendu
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) setSessionReady(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      } else {
        // Attendre 2s au cas où le token est encore en transit
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) router.replace('/login')
            else setSessionReady(true)
          })
        }, 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()

    // Vérifier la session avant de soumettre
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expirée. Veuillez redemander un lien d\'invitation.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(`Erreur : ${error.message}`)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenue !</h1>
        <p className="text-gray-500 text-sm mb-8">
          Créez votre mot de passe pour accéder au portail.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="8 caractères minimum"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Créer mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

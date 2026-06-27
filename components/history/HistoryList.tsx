'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ConvSummary {
  id: string
  title: string
  updated_at: string
}

export default function HistoryList() {
  const [conversations, setConversations] = useState<ConvSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then((data) => { setConversations(data); setLoading(false) })
  }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>
  if (!conversations.length) return <p className="text-sm text-gray-400">Aucune conversation sauvegardée.</p>

  return (
    <div className="space-y-2 max-w-2xl">
      {conversations.map((conv) => (
        <div key={conv.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:shadow-sm transition">
          <Link href={`/dashboard/chat/${conv.id}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{conv.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(conv.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </Link>
          <button
            onClick={() => handleDelete(conv.id)}
            className="ml-4 text-xs text-red-400 hover:text-red-600 transition"
          >
            Supprimer
          </button>
        </div>
      ))}
    </div>
  )
}

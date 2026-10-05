import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFichesHeaders, getFichesFull } from '@/lib/notion/client'
import { chatTwoPasses, chatSynthesis } from '@/lib/anthropic/client'

// Détecte une question conversationnelle ne nécessitant pas de fiches
function isConversational(question: string): boolean {
  const q = question.toLowerCase().trim()
  return /^(reformule|raccourcis|traduis|simplifie|mets en forme|reformat)/.test(q)
    || /^(résume|synthétise|développe|explique autrement)\s+(en\b|ça|cela|cette|ce texte|la réponse|tout ça)/.test(q)
    || /^plus (court|long|simple|détaillé|concis)/.test(q)
    || /\ben \d+ (mots|points|lignes|bullet|étapes)\b/.test(q)
    || /autrement dit/.test(q)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { question, conversationId } = await request.json()
    if (!question?.trim()) return NextResponse.json({ error: 'Question vide' }, { status: 400 })


    // Récupérer l'historique existant depuis Supabase
    let history: { role: 'user' | 'assistant'; content: string }[] = []
    let existingMessages: any[] = []

    if (conversationId) {
      const { data: existing } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single()

      if (existing?.messages) {
        existingMessages = existing.messages as any[]
        history = existingMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
      }
    }

    // Déterminer si fiches nécessaires
    const needsFiches = !isConversational(question) || history.length === 0
    let filteredIds: string[] = []

    if (needsFiches) {
      const headers = await getFichesHeaders()
      console.log('[chat] headers count:', headers.length)
      const { selectedFicheIds } = await chatTwoPasses(question, headers)
      const validIds = new Set(headers.map((h) => h.id))
      filteredIds = selectedFicheIds.filter((id) => validIds.has(id))
      console.log('[chat] filteredIds:', filteredIds)
    } else {
      console.log('[chat] question conversationnelle — pas de fiches chargées')
    }

    // Charger les fiches complètes
    const fiches = filteredIds.length > 0 ? await getFichesFull(filteredIds) : []
    console.log('[chat] fiches loaded:', fiches.length)

    const fichesDocs = fiches.map((f) => ({
      id: f.id,
      title: f.title,
      content: f.content,
      url: `/dashboard/fiches/${f.id}`,
    }))

    const { synthesis, citedFiches } = await chatSynthesis(question, fichesDocs, history)
    console.log('[chat] synthesis length:', synthesis?.length, '| citedFiches:', citedFiches?.length)

    // Sauvegarder la conversation
    let convId = conversationId

    if (convId && existingMessages.length > 0) {
      const messages = [
        ...existingMessages,
        { role: 'user', content: question },
        { role: 'assistant', content: synthesis, citedFiches },
      ]
      await supabase
        .from('conversations')
        .update({ messages, updated_at: new Date().toISOString() })
        .eq('id', convId)
    } else {
      const headingMatch = synthesis.match(/^#{1,3}\s+(.+)$/m)
      const rawTitle = headingMatch ? headingMatch[1].trim() : question
      const title = rawTitle.length > 80 ? rawTitle.slice(0, 80) + '…' : rawTitle
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          messages: [
            { role: 'user', content: question },
            { role: 'assistant', content: synthesis, citedFiches },
          ],
        })
        .select()
        .single()
      convId = newConv?.id
    }

    return NextResponse.json({ synthesis, citedFiches, conversationId: convId })

  } catch (err: any) {
    console.error('[/api/chat] erreur:', err?.message ?? err)
    const message = err?.status === 400 && err?.message?.includes('credit balance')
      ? 'Crédits IA insuffisants, contactez l\'administrateur à [contact@ofcentral.fr](mailto:contact@ofcentral.fr).'
      : err?.message ?? 'Erreur interne'
    return NextResponse.json({ error: message }, { status: err?.status ?? 500 })
  }
}
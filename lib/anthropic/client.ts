import Anthropic from '@anthropic-ai/sdk'
import { FicheReference, ChatPassResult } from '@/lib/types'
import { getSystemPrompt } from '@/lib/config/getSystemPrompt'

const anthropic = new Anthropic({ apiKey: process.env.APP_ANTHROPIC_KEY })
const MODEL = 'claude-sonnet-4-6'

type HistoryMessage = { role: 'user' | 'assistant'; content: string }

export async function chatTwoPasses(
  question: string,
  fichesHeaders: FicheReference[]
): Promise<ChatPassResult> {
  const systemPrompt = await getSystemPrompt()

  const headersText = fichesHeaders
    .map((f, i) => `${i + 1}. [ID: ${f.id}] ${f.title}`)
    .join('\n')

  const pass1 = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Voici une liste de fiches disponibles :\n\n${headersText}\n\nQuestion de l'utilisateur : "${question}"\n\nIdentifie les 10 à 20 fiches les plus pertinentes pour répondre à cette question. Réponds UNIQUEMENT avec un JSON valide de la forme : {"ids": ["id1", "id2", ...]}`,
      },
    ],
  })

  const pass1Text = pass1.content[0].type === 'text' ? pass1.content[0].text : ''
  let selectedIds: string[] = []
  try {
    const jsonMatch = pass1Text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      selectedIds = parsed.ids ?? []
    }
  } catch {
    selectedIds = fichesHeaders.slice(0, 10).map((f) => f.id)
  }

  return { selectedFicheIds: selectedIds, synthesis: '', citedFiches: [] }
}

export async function chatSynthesis(
  question: string,
  fichesContent: { id: string; title: string; content: string; url: string }[],
  history: HistoryMessage[] = []
): Promise<{ synthesis: string; citedFiches: FicheReference[] }> {
  const systemPrompt = await getSystemPrompt()

  const fichesDocs = fichesContent
    .map((f) => `## ${f.title}\n\nURL : ${f.url}\n\n${f.content}`)
    .join('\n\n---\n\n')

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: fichesContent.length > 0
        ? `Voici les fiches de référence (chacune avec son titre, son URL et son contenu) :\n\n${fichesDocs}\n\n---\n\nQuestion : "${question}"\n\nRéponds de façon structurée et précise en t'appuyant sur les fiches. Après chaque paragraphe ou partie du texte issue d'une ou plusieurs fiches, insère sur une nouvelle ligne (ligne vide puis lien) un lien markdown vers la ou les fiches sources, sous la forme : [Titre de la fiche](url). Ne regroupe pas les sources en fin de réponse.`
        : `Question : "${question}"\n\nRéponds directement et de façon structurée.`,
    },
  ]

  const pass2 = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  })

  const responseText = pass2.content[0].type === 'text' ? pass2.content[0].text : ''

  // Extraire les fiches citées depuis les liens inline
  const linkRegex = /\[([^\]]+)\]\((\/dashboard\/fiches\/[^)]+)\)/g
  const citedFiches: FicheReference[] = []
  const seen = new Set<string>()
  let match
  while ((match = linkRegex.exec(responseText)) !== null) {
    const [, title, url] = match
    const id = url.replace('/dashboard/fiches/', '')
    if (!seen.has(id)) {
      seen.add(id)
      citedFiches.push({ id, title, url })
    }
  }

  return { synthesis: responseText, citedFiches }
}

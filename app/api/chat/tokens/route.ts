import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSystemPrompt } from '@/lib/config/getSystemPrompt'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-6'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, conversationId } = await request.json()

    let convMessages = messages ?? []

    if (conversationId && convMessages.length === 0) {
      const { data } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single()
      convMessages = (data?.messages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    }

    if (convMessages.length === 0) {
      return NextResponse.json({ inputTokens: 0, conversationMessages: 0 })
    }

    const systemPrompt = await getSystemPrompt()

    const result = await anthropic.messages.countTokens({
      model: MODEL,
      system: systemPrompt,
      messages: convMessages,
    })

    return NextResponse.json({
      inputTokens: result.input_tokens,
      conversationMessages: convMessages.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Erreur' }, { status: 500 })
  }
}

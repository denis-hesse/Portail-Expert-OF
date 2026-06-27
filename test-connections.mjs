import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env.local manually
const __dir = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(join(__dir, '.env.local'), 'utf-8')
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

// â”€â”€ 1. Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function testSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  // Try to list tables (unauthenticated â†’ expects auth error, not network error)
  const { error } = await client.from('conversations').select('id').limit(1)
  if (error?.code === 'PGRST301' || error?.message?.includes('JWT') || error?.message?.includes('not authenticated') || error?.message?.includes('permission')) {
    return `OK (auth requise comme attendu : ${error.message})`
  }
  if (!error) return 'OK (table conversations accessible)'
  return `ERREUR : ${error.message}`
}

// â”€â”€ 2. Notion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function testNotion() {
  const { Client } = await import('@notionhq/client')
  const notion = new Client({ auth: process.env.NOTION_API_KEY })
  const res = await notion.dataSources.query({
    data_source_id: process.env.NOTION_FICHES_DB_ID,
    page_size: 1,
  })
  return `OK (${res.results.length} rÃ©sultat(s) retournÃ©(s), has_more=${res.has_more})`
}

// â”€â”€ 3. Anthropic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function testAnthropic() {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16,
    messages: [{ role: 'user', content: 'RÃ©ponds juste "OK"' }],
  })
  return `OK (${msg.content[0].type === 'text' ? msg.content[0].text.trim() : '?'})`
}

// â”€â”€ Run â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
console.log('Test des connexions...\n')

for (const [name, fn] of [['Supabase', testSupabase], ['Notion', testNotion], ['Anthropic', testAnthropic]]) {
  try {
    const result = await fn()
    console.log(`âœ“ ${name}: ${result}`)
  } catch (e) {
    console.log(`âœ— ${name}: ${e.message}`)
  }
}

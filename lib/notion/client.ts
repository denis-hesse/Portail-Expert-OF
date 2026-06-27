import { Client } from '@notionhq/client'
import { Fiche, Report, FicheReference, SourceRef } from '@/lib/types'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// ─── Caches module-level ──────────────────────────────────────────────────
const HEADERS_TTL  = 10 * 60 * 1000  // 10 min
const FICHES_TTL   = 30 * 60 * 1000  // 30 min
const VALIDEES_TTL = 10 * 60 * 1000  // 10 min

let headersCache:  { data: FicheReference[]; ts: number } | null = null
let valideesCache: { data: Fiche[];          ts: number } | null = null
const ficheCache         = new Map<string, { data: Fiche;     ts: number }>()
const relationTitleCache = new Map<string, string>()
const sourceRefCache     = new Map<string, { data: SourceRef; ts: number }>()

// ─── Helpers ──────────────────────────────────────────────────────────────

async function resolveRelationTitle(id: string): Promise<string> {
  if (relationTitleCache.has(id)) return relationTitleCache.get(id)!
  try {
    const page = await notion.pages.retrieve({ page_id: id }) as any
    const title =
      page.properties?.Titre?.title?.[0]?.plain_text ??
      page.properties?.Name?.title?.[0]?.plain_text ??
      page.properties?.Nom?.title?.[0]?.plain_text ?? ''
    relationTitleCache.set(id, title)
    return title
  } catch {
    return ''
  }
}

async function resolveFirstRelation(prop: any): Promise<string> {
  const ids: string[] = prop?.relation?.map((r: any) => r.id) ?? []
  if (ids.length === 0) return ''
  return resolveRelationTitle(ids[0])
}

async function resolveSourceRef(id: string): Promise<SourceRef> {
  const cached = sourceRefCache.get(id)
  if (cached && Date.now() - cached.ts < FICHES_TTL) return cached.data
  try {
    const page = await notion.pages.retrieve({ page_id: id }) as any
    const props = page.properties ?? {}
    const name =
      props?.['Nom de la source']?.title?.[0]?.plain_text ??
      props?.Nom?.title?.[0]?.plain_text ??
      props?.Name?.title?.[0]?.plain_text ??
      props?.Titre?.title?.[0]?.plain_text ?? ''
    const url = props?.URL?.url ?? props?.Url?.url ?? ''
    const ref: SourceRef = { name, url }
    sourceRefCache.set(id, { data: ref, ts: Date.now() })
    return ref
  } catch {
    return { name: '', url: '' }
  }
}

async function resolveSourceRefs(relationProp: any, textProp: any): Promise<SourceRef[]> {
  const ids: string[] = relationProp?.relation?.map((r: any) => r.id) ?? []
  const linked = ids.length > 0
    ? (await Promise.all(ids.map(resolveSourceRef))).filter((r) => r.name || r.url)
    : []
  const linkedNames = new Set(linked.map((r) => r.name.toLowerCase()))
  const textSources: SourceRef[] = (textProp?.rich_text ?? [])
    .map((t: any) => t.plain_text?.trim())
    .filter((s: string) => s && !linkedNames.has(s.toLowerCase()))
    .map((s: string) => ({ name: s, url: '' }))
  return [...linked, ...textSources]
}

async function getPageContent(pageId: string): Promise<string> {
  const blocks = await notion.blocks.children.list({ block_id: pageId })
  return blocks.results.map(blockToText).filter(Boolean).join('\n\n')
}

function blockToText(block: any): string {
  const { type } = block
  const content = block[type]
  if (!content) return ''
  const richText = (texts: any[]) => texts?.map((t: any) => t.plain_text).join('') ?? ''
  switch (type) {
    case 'paragraph':          return richText(content.rich_text)
    case 'heading_1':          return `# ${richText(content.rich_text)}`
    case 'heading_2':          return `## ${richText(content.rich_text)}`
    case 'heading_3':          return `### ${richText(content.rich_text)}`
    case 'bulleted_list_item': return `• ${richText(content.rich_text)}`
    case 'numbered_list_item': return `1. ${richText(content.rich_text)}`
    case 'quote':              return `> ${richText(content.rich_text)}`
    case 'callout':            return richText(content.rich_text)
    case 'code':               return `\`\`\`\n${richText(content.rich_text)}\n\`\`\``
    default:                   return ''
  }
}

// ─── API publique ──────────────────────────────────────────────────────────

export async function getFichesHeaders(): Promise<FicheReference[]> {
  if (headersCache && Date.now() - headersCache.ts < HEADERS_TTL) {
    return headersCache.data
  }

  const dbId = process.env.NOTION_FICHES_DB_ID!
  const results: FicheReference[] = []
  let cursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: dbId,
      start_cursor: cursor,
      filter: {
        property: 'Validité',
        select: { equals: 'Validée' },
      } as any,
      page_size: 100,
    })
    for (const page of response.results) {
      if (page.object !== 'page') continue
      const p = page as any
      const title   = p.properties?.Titre?.title?.[0]?.plain_text ?? 'Sans titre'
      const summary = p.properties?.Résumé?.rich_text?.[0]?.plain_text ?? ''
      results.push({ id: p.id, title: `${title}${summary ? ' — ' + summary : ''}`, url: p.url })
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  headersCache = { data: results, ts: Date.now() }
  return results
}

export async function getFichesFull(ids: string[]): Promise<Fiche[]> {
  const now = Date.now()

  const fiches = await Promise.all(
    ids.map(async (id) => {
      const cached = ficheCache.get(id)
      if (cached && now - cached.ts < FICHES_TTL) return cached.data

      const [page, content] = await Promise.all([
        notion.pages.retrieve({ page_id: id }),
        getPageContent(id),
      ])
      const p = page as any
      const props = p.properties

      const [theme, subtheme, sources] = await Promise.all([
        resolveFirstRelation(props?.Thème),
        resolveFirstRelation(props?.['Sous-thème']),
        resolveSourceRefs(props?.['→ Sources'], props?.Sources),
      ])

      const fiche: Fiche = {
        id: p.id,
        title: props?.Titre?.title?.[0]?.plain_text ?? 'Sans titre',
        domain: props?.Domaine?.select?.name ?? '',
        theme,
        subtheme,
        summary: props?.Résumé?.rich_text?.[0]?.plain_text ?? '',
        content,
        sources,
        regulatoryTexts: props?.['Textes réglementaires']?.rich_text?.map((t: any) => t.plain_text) ?? [],
        notionUrl: p.url,
        status: props?.['Validaté']?.select?.name ?? '',
      }
      ficheCache.set(id, { data: fiche, ts: now })
      return fiche
    })
  )

  return fiches
}

export async function getFichesValidees(): Promise<Fiche[]> {
  if (valideesCache && Date.now() - valideesCache.ts < VALIDEES_TTL) {
    return valideesCache.data
  }

  const dbId = process.env.NOTION_FICHES_DB_ID!
  const pages: any[] = []
  let cursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: dbId,
      start_cursor: cursor,
      filter: {
        property: 'Validité',
        select: { equals: 'Validée' },
      } as any,
      page_size: 100,
    })
    for (const page of response.results) {
      if (page.object === 'page') pages.push(page)
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  // Résoudre toutes les relations Thème/Sous-thème en parallèle
  const fiches: Fiche[] = await Promise.all(
    pages.map(async (p) => {
      const props = p.properties
      const [theme, subtheme] = await Promise.all([
        resolveFirstRelation(props?.Thème),
        resolveFirstRelation(props?.['Sous-thème']),
      ])
      return {
        id: p.id,
        title: props?.Titre?.title?.[0]?.plain_text ?? 'Sans titre',
        domain: props?.Domaine?.select?.name ?? '',
        theme,
        subtheme,
        summary: props?.Résumé?.rich_text?.[0]?.plain_text ?? '',
        content: '',
        sources: [],
        regulatoryTexts: [],
        notionUrl: p.url,
        status: props?.['Validité']?.select?.name ?? '',
      }
    })
  )

  valideesCache = { data: fiches, ts: Date.now() }
  return fiches
}

export async function getFicheById(id: string): Promise<Fiche | null> {
  const now = Date.now()
  const cached = ficheCache.get(id)
  if (cached && now - cached.ts < FICHES_TTL) return cached.data

  try {
    const [page, content] = await Promise.all([
      notion.pages.retrieve({ page_id: id }),
      getPageContent(id),
    ])
    const p = page as any
    const props = p.properties

    const [theme, subtheme, sources] = await Promise.all([
      resolveFirstRelation(props?.Thème),
      resolveFirstRelation(props?.['Sous-thème']),
      resolveSourceRefs(props?.['→ Sources'], props?.Sources),
    ])

    const fiche: Fiche = {
      id: p.id,
      title: props?.Titre?.title?.[0]?.plain_text ?? 'Sans titre',
      domain: props?.Domaine?.select?.name ?? '',
      theme,
      subtheme,
      summary: props?.Résumé?.rich_text?.[0]?.plain_text ?? '',
      content,
      sources,
      regulatoryTexts: props?.['Textes réglementaires']?.rich_text?.map((t: any) => t.plain_text) ?? [],
      notionUrl: p.url,
      status: props?.['Validité']?.select?.name ?? '',
    }
    ficheCache.set(id, { data: fiche, ts: now })
    return fiche
  } catch {
    return null
  }
}

export async function getRapports(): Promise<Report[]> {
  const pageId = process.env.NOTION_RAPPORTS_PAGE_ID!
  const response = await notion.blocks.children.list({ block_id: pageId })
  const reports: Report[] = []
  for (const block of response.results) {
    const b = block as any
    if (b.type === 'child_page') {
      reports.push({
        id: b.id,
        title: b.child_page.title,
        date: b.created_time,
        content: '',
        notionUrl: `https://notion.so/${b.id.replace(/-/g, '')}`,
      })
    }
  }
  return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getRapportById(id: string): Promise<Report | null> {
  try {
    const [page, content] = await Promise.all([
      notion.pages.retrieve({ page_id: id }),
      getPageContent(id),
    ])
    const p = page as any
    return {
      id: p.id,
      title: p.properties?.title?.title?.[0]?.plain_text ?? 'Rapport',
      date: p.created_time,
      content,
      notionUrl: p.url,
    }
  } catch {
    return null
  }
}

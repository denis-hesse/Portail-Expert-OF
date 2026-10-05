import { Client } from '@notionhq/client'
import { Fiche, Report, FicheHeader, SourceRef } from '@/lib/types'

const notion = new Client({ auth: process.env.NOTION_API_KEY })

// ─── Caches module-level ──────────────────────────────────────────────────
const HEADERS_TTL  = 10 * 60 * 1000  // 10 min
const FICHES_TTL   = 30 * 60 * 1000  // 30 min
const VALIDEES_TTL = 10 * 60 * 1000  // 10 min
const TAXO_TTL     = 60 * 60 * 1000  // 60 min

// IDs de data source (socle §1). Surcharge possible par variable d'environnement.
const THEMES_DS_ID      = process.env.NOTION_THEMES_DS_ID      ?? '34baf029-a679-800a-bfc6-000b9782d80e'
const SOUS_THEMES_DS_ID = process.env.NOTION_SOUS_THEMES_DS_ID ?? '9d5f0493-449a-493e-a16b-10d4c3693cb9'
// Enregistrement factice « Sans texte réglementaire associé » (socle §3) : jamais restitué.
const TEXTE_FACTICE_ID  = '359af029a6798165b5ccf71a1ab4be5b'

let headersCache:  { data: FicheHeader[];    ts: number } | null = null
let taxoCache:     { data: Map<string, string>; ts: number } | null = null
let valideesCache: { data: Fiche[];          ts: number } | null = null
const ficheCache         = new Map<string, { data: Fiche;     ts: number }>()
const relationTitleCache = new Map<string, string>()
const sourceRefCache     = new Map<string, { data: SourceRef; ts: number }>()

// ─── Helpers ──────────────────────────────────────────────────────────────

// Fiche utilisable (socle §5 SOURCES, page Alternative §0.5) :
// `Validité fiche` = Validée ET rollup `Validité source` = Validée seul.
// Rollup vide, valeur absente ou valeurs multiples => fiche exclue.
function isFicheUtilisable(props: any): boolean {
  if (props?.['Validité fiche']?.select?.name !== 'Validée') return false
  const rollup = props?.['Validité source']?.rollup
  if (rollup?.type !== 'array' || !Array.isArray(rollup.array)) return false
  const valeurs = rollup.array.map((item: any) => item?.select?.name ?? null)
  return valeurs.length > 0 && valeurs.every((v: string | null) => v === 'Validée')
}

// Texte complet d'une propriété title/rich_text (tous les segments, pas seulement le 1er).
function plain(prop: any): string {
  const arr = prop?.title ?? prop?.rich_text ?? []
  return arr.map((t: any) => t?.plain_text ?? '').join('').trim()
}

// Titre d'une page quel que soit le nom de sa propriété title.
function pageTitle(props: any): string {
  for (const v of Object.values(props ?? {}) as any[]) {
    if (v?.type === 'title') return plain(v)
  }
  return ''
}

function relationIds(prop: any): string[] {
  return prop?.relation?.map((r: any) => r.id) ?? []
}

async function resolveRelationTitle(id: string): Promise<string> {
  if (relationTitleCache.has(id)) return relationTitleCache.get(id)!
  try {
    const page = await notion.pages.retrieve({ page_id: id }) as any
    const title = pageTitle(page.properties)
    relationTitleCache.set(id, title)
    return title
  } catch {
    return ''
  }
}

async function queryAllPages(dataSourceId: string): Promise<any[]> {
  const pages: any[] = []
  let cursor: string | undefined
  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of response.results) if (page.object === 'page') pages.push(page)
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)
  return pages
}

// Table ID de page → nom, pour THÈMES et SOUS-THÈMES, chargée une fois (TTL 60 min).
// En cas d'échec, table vide : les noms sont alors résolus page par page.
async function getTaxonomie(): Promise<Map<string, string>> {
  if (taxoCache && Date.now() - taxoCache.ts < TAXO_TTL) return taxoCache.data
  const map = new Map<string, string>()
  try {
    const [themes, sousThemes] = await Promise.all([
      queryAllPages(THEMES_DS_ID),
      queryAllPages(SOUS_THEMES_DS_ID),
    ])
    for (const p of [...themes, ...sousThemes]) map.set(p.id, pageTitle(p.properties))
    taxoCache = { data: map, ts: Date.now() }
  } catch (err: any) {
    console.error('[notion] taxonomie non chargée:', err?.message ?? err)
  }
  return map
}

// Noms de toutes les pages liées (Thème, Sous-thème), séparés par « , ».
async function resolveRelationNames(prop: any, taxo: Map<string, string>): Promise<string> {
  const names = await Promise.all(
    relationIds(prop).map((id) => taxo.get(id) ?? resolveRelationTitle(id))
  )
  return names.filter(Boolean).join(', ')
}

// → Textes réglementaires : intitulés des textes liés, enregistrement factice exclu.
async function resolveTextesReglementaires(prop: any): Promise<string[]> {
  const ids = relationIds(prop).filter((id) => id.replace(/-/g, '') !== TEXTE_FACTICE_ID)
  const titles = await Promise.all(ids.map(resolveRelationTitle))
  return titles.filter(Boolean)
}

async function resolveSourceRef(id: string): Promise<SourceRef> {
  const cached = sourceRefCache.get(id)
  if (cached && Date.now() - cached.ts < FICHES_TTL) return cached.data
  try {
    const page = await notion.pages.retrieve({ page_id: id }) as any
    const props = page.properties ?? {}
    const name = plain(props?.['Nom de la source']) || pageTitle(props)
    const url = props?.URL?.url ?? ''
    const ref: SourceRef = { name, url }
    sourceRefCache.set(id, { data: ref, ts: Date.now() })
    return ref
  } catch {
    return { name: '', url: '' }
  }
}

// Bloc Sources construit sur la seule relation `→ Sources` (§0.10).
async function resolveSourceRefs(relationProp: any): Promise<SourceRef[]> {
  const refs = await Promise.all(relationIds(relationProp).map(resolveSourceRef))
  return refs.filter((r) => r.name || r.url)
}

// Corps de page : lecture récursive et paginée des blocs (§0.10, §4 bis).
// Couvre listes imbriquées, tableaux, bascules, encadrés, colonnes et blocs synchronisés.
// Les sous-pages et bases incluses ne sont pas parcourues.
const MAX_DEPTH = 8

async function listAllChildren(blockId: string): Promise<any[]> {
  const blocks: any[] = []
  let cursor: string | undefined
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    })
    blocks.push(...response.results)
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)
  return blocks
}

function richText(texts: any[] | undefined): string {
  return texts?.map((t: any) => t?.plain_text ?? '').join('') ?? ''
}

async function tableToText(block: any): Promise<string> {
  const rows = (await listAllChildren(block.id)).filter((r: any) => r.type === 'table_row')
  if (rows.length === 0) return ''
  const esc = (c: string) => c.replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const lines = rows.map((r: any) =>
    `| ${(r.table_row?.cells ?? []).map((cell: any[]) => esc(richText(cell))).join(' | ')} |`
  )
  if (block.table?.has_column_header && lines.length > 0) {
    const width = rows[0].table_row?.cells?.length ?? 1
    lines.splice(1, 0, `|${' --- |'.repeat(width)}`)
  }
  return lines.join('\n')
}

async function blocksToText(blockId: string, depth = 0): Promise<string> {
  if (depth > MAX_DEPTH) return ''
  const blocks = await listAllChildren(blockId)
  const out: string[] = []
  const indent = '  '.repeat(depth)
  let num = 0

  for (const block of blocks) {
    const { type } = block
    const c = block[type] ?? {}
    num = type === 'numbered_list_item' ? num + 1 : 0

    let line = ''
    let childDepth = depth      // profondeur des enfants
    let recurse = block.has_children

    switch (type) {
      case 'paragraph':          line = richText(c.rich_text); break
      case 'heading_1':          line = `# ${richText(c.rich_text)}`; break
      case 'heading_2':          line = `## ${richText(c.rich_text)}`; break
      case 'heading_3':          line = `### ${richText(c.rich_text)}`; break
      case 'bulleted_list_item': line = `• ${richText(c.rich_text)}`; childDepth = depth + 1; break
      case 'numbered_list_item': line = `${num}. ${richText(c.rich_text)}`; childDepth = depth + 1; break
      case 'to_do':              line = `[${c.checked ? 'x' : ' '}] ${richText(c.rich_text)}`; childDepth = depth + 1; break
      case 'toggle':             line = richText(c.rich_text); childDepth = depth + 1; break
      case 'quote':              line = `> ${richText(c.rich_text)}`; break
      case 'callout':            line = richText(c.rich_text); break
      case 'code':               line = `\`\`\`\n${richText(c.rich_text)}\n\`\`\``; break
      case 'equation':           line = c.expression ?? ''; break
      case 'divider':            line = '---'; break
      case 'bookmark':
      case 'embed':
      case 'link_preview':       line = c.url ?? ''; break
      case 'table':
        line = await tableToText(block)
        recurse = false
        break
      case 'synced_block': {
        const src = c.synced_from?.block_id
        if (src) {
          const txt = await blocksToText(src, depth)
          if (txt) out.push(txt)
          recurse = false
        }
        break
      }
      case 'column_list':
      case 'column':
        break
      case 'child_page':
      case 'child_database':
        recurse = false
        break
      default:
        break
    }

    if (line) out.push(line.includes('\n') ? line : indent + line)
    if (recurse) {
      const txt = await blocksToText(block.id, childDepth)
      if (txt) out.push(txt)
    }
  }
  return out.join('\n')
}

async function getPageContent(pageId: string): Promise<string> {
  return blocksToText(pageId)
}

// ─── API publique ──────────────────────────────────────────────────────────

export async function getFichesHeaders(): Promise<FicheHeader[]> {
  if (headersCache && Date.now() - headersCache.ts < HEADERS_TTL) {
    return headersCache.data
  }

  const dbId = process.env.NOTION_FICHES_DB_ID!
  const pages: any[] = []
  let cursor: string | undefined

  do {
    const response = await notion.dataSources.query({
      data_source_id: dbId,
      start_cursor: cursor,
      filter: {
        property: 'Validité fiche',
        select: { equals: 'Validée' },
      } as any,
      page_size: 100,
    })
    for (const page of response.results) {
      if (page.object !== 'page') continue
      const p = page as any
      if (!isFicheUtilisable(p.properties)) continue
      pages.push(p)
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  const taxo = await getTaxonomie()
  const results: FicheHeader[] = await Promise.all(
    pages.map(async (p) => {
      const props = p.properties
      const [theme, subtheme] = await Promise.all([
        resolveRelationNames(props?.Thème, taxo),
        resolveRelationNames(props?.['Sous-thème'], taxo),
      ])
      return {
        id: p.id,
        title: plain(props?.Titre) || 'Sans titre',
        url: p.url,
        summary: plain(props?.Résumé),
        searchIndex: plain(props?.['Index de recherche']),
        domain: props?.Domaine?.select?.name ?? '',
        theme,
        subtheme,
      }
    })
  )

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
      if (!isFicheUtilisable(props)) return null

      const taxo = await getTaxonomie()
      const [theme, subtheme, sources, regulatoryTexts] = await Promise.all([
        resolveRelationNames(props?.Thème, taxo),
        resolveRelationNames(props?.['Sous-thème'], taxo),
        resolveSourceRefs(props?.['→ Sources']),
        resolveTextesReglementaires(props?.['→ Textes réglementaires']),
      ])

      const fiche: Fiche = {
        id: p.id,
        title: plain(props?.Titre) || 'Sans titre',
        domain: props?.Domaine?.select?.name ?? '',
        theme,
        subtheme,
        summary: plain(props?.Résumé),
        content,
        sources,
        regulatoryTexts,
        notionUrl: p.url,
        status: props?.['Validité fiche']?.select?.name ?? '',
      }
      ficheCache.set(id, { data: fiche, ts: now })
      return fiche
    })
  )

  return fiches.filter((f): f is Fiche => f !== null)
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
        property: 'Validité fiche',
        select: { equals: 'Validée' },
      } as any,
      page_size: 100,
    })
    for (const page of response.results) {
      if (page.object === 'page' && isFicheUtilisable((page as any).properties)) pages.push(page)
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined
  } while (cursor)

  // Résoudre toutes les relations Thème/Sous-thème en parallèle
  const taxo = await getTaxonomie()
  const fiches: Fiche[] = await Promise.all(
    pages.map(async (p) => {
      const props = p.properties
      const [theme, subtheme] = await Promise.all([
        resolveRelationNames(props?.Thème, taxo),
        resolveRelationNames(props?.['Sous-thème'], taxo),
      ])
      return {
        id: p.id,
        title: plain(props?.Titre) || 'Sans titre',
        domain: props?.Domaine?.select?.name ?? '',
        theme,
        subtheme,
        summary: plain(props?.Résumé),
        content: '',
        sources: [],
        regulatoryTexts: [],
        notionUrl: p.url,
        status: props?.['Validité fiche']?.select?.name ?? '',
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
    if (!isFicheUtilisable(props)) return null

    const taxo = await getTaxonomie()
    const [theme, subtheme, sources, regulatoryTexts] = await Promise.all([
      resolveRelationNames(props?.Thème, taxo),
      resolveRelationNames(props?.['Sous-thème'], taxo),
      resolveSourceRefs(props?.['→ Sources']),
      resolveTextesReglementaires(props?.['→ Textes réglementaires']),
    ])

    const fiche: Fiche = {
      id: p.id,
      title: plain(props?.Titre) || 'Sans titre',
      domain: props?.Domaine?.select?.name ?? '',
      theme,
      subtheme,
      summary: plain(props?.Résumé),
      content,
      sources,
      regulatoryTexts,
      notionUrl: p.url,
      status: props?.['Validité fiche']?.select?.name ?? '',
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

# Portail Expert CPF-RS-RNCP — MVP

Portail web de questions-réponses sur la réglementation de la formation en France.
L'utilisateur pose une question, Claude sélectionne les fiches pertinentes dans Notion et génère une réponse structurée.

---

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** — auth utilisateur + stockage des conversations (table `conversations`)
- **Notion API** (`@notionhq/client`) — base de fiches de connaissance, rapports de veille
- **Anthropic SDK** (`@anthropic-ai/sdk`) — modèle `claude-sonnet-4-6`, two-pass
- **react-markdown** — rendu markdown des réponses
- **Tailwind CSS** + variables CSS custom (thème clair/sombre via `ThemeProvider`)

---

## Architecture

### Flux principal d'une question

```
ChatInterface (client)
  → POST /api/chat
    → Notion : getFichesHeaders()          — liste titres+résumés des fiches validées
    → Anthropic : chatTwoPasses()          — pass 1 : sélection des 10-20 fiches pertinentes
    → Notion : getFichesFull(ids)          — contenu complet des fiches sélectionnées
    → Anthropic : chatSynthesis()          — pass 2 : réponse + fiches citées (JSON)
    → Supabase : upsert conversation
  ← { synthesis, citedFiches, conversationId }
```

### Détection conversationnelle
Si la question est une reformulation/résumé d'une réponse précédente (`isConversational()`), les fiches ne sont pas rechargées — réponse directe depuis l'historique.

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `app/api/chat/route.ts` | Orchestration principale |
| `app/api/chat/tokens/route.ts` | Estimation tokens (`/tk`) |
| `lib/anthropic/client.ts` | `chatTwoPasses` + `chatSynthesis` |
| `lib/notion/client.ts` | Accès Notion (fiches, rapports) avec cache TTL |
| `lib/config/getSystemPrompt.ts` | System prompt chargé depuis une page Notion (cache 1h) |
| `lib/types.ts` | Types partagés : `Message`, `Fiche`, `Conversation`, `FicheReference`, `Report` |
| `components/chat/ChatInterface.tsx` | Interface chat (messages, panneau sources, phases de chargement) |
| `components/layout/Sidebar.tsx` | Navigation dashboard |
| `app/dashboard/layout.tsx` | Guard auth Supabase + layout dashboard |
| `app/page.tsx` | Redirect vers `/dashboard` ou `/login` selon session |

---

## Variables d'environnement requises (`.env.local`)

```
APP_ANTHROPIC_KEY          # (pas ANTHROPIC_API_KEY — réservé par Claude Code)
NOTION_API_KEY
NOTION_FICHES_DB_ID          # data_source_id base FICHES DE CONNAISSANCE
NOTION_SYSTEM_PROMPT_PAGE_ID # page Notion contenant le system prompt
NOTION_RAPPORTS_PAGE_ID      # page parente des rapports de veille
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Cache Notion (module-level)

| Cache | TTL |
|---|---|
| `headersCache` (titres fiches) | 10 min |
| `ficheCache` (contenu fiche par ID) | 30 min |
| `valideesCache` (liste fiches validées) | 10 min |
| `getSystemPrompt` | 1 h |

---

## Schéma Supabase — table `conversations`

| Colonne | Type |
|---|---|
| `id` | uuid |
| `user_id` | uuid (ref auth.users) |
| `title` | text |
| `messages` | jsonb — `{role, content, citedFiches?}[]` |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |

---

## Commandes

```bash
npm run dev     # dev sur localhost:3000
npm run build   # build production
npm run start   # démarrer le build
```

---

## Skills disponibles

- `.claude/skills/notion-mcp-fiches/SKILL.md` — IDs des bases Notion, schémas de propriétés, séquence de création de fiches via MCP
- `.claude/skills/workflow-veille-fiches/SKILL.md` — workflow de génération et de veille des fiches

export interface Message {
  role: 'user' | 'assistant'
  content: string
  citedFiches?: FicheReference[]
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
}

export interface FicheReference {
  id: string
  title: string
  url: string
}

// En-tête de fiche pour la passe 1 (sélection) : propriétés indexées, jamais le corps (§0.5).
export interface FicheHeader extends FicheReference {
  summary: string
  searchIndex: string
  domain: string
  theme: string
  subtheme: string
}

export interface SourceRef {
  name: string
  url: string
}

export interface Fiche {
  id: string
  title: string
  domain: string
  theme: string
  subtheme: string
  summary: string
  content: string
  sources: SourceRef[]
  regulatoryTexts: string[]
  notionUrl: string
  status: string
}

export interface Report {
  id: string
  title: string
  date: string
  content: string
  notionUrl: string
  isNew?: boolean
}

export interface ChatPassResult {
  selectedFicheIds: string[]
  synthesis: string
  citedFiches: FicheReference[]
}

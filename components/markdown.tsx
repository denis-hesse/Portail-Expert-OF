import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Tableaux, barrés et liens automatiques (syntaxe GFM), absents de react-markdown seul.
export const remarkPlugins = [remarkGfm]

// Les tableaux défilent horizontalement dans leur cadre au lieu d'élargir la réponse.
export const markdownComponents: Components = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  table: ({ node, ...props }) => (
    <div className="table-wrap">
      <table {...props} />
    </div>
  ),
}

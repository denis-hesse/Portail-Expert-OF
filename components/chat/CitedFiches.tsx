import { FicheReference } from '@/lib/types'

export default function CitedFiches({ fiches }: { fiches: FicheReference[] }) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-500 mb-2">Fiches citées :</p>
      <ul className="space-y-1">
        {fiches.map((f) => (
          <li key={f.id}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              {f.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

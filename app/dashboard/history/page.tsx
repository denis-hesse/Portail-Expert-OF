import HistoryList from '@/components/history/HistoryList'

export default function HistoryPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Conversations</h1>
      <HistoryList />
    </div>
  )
}

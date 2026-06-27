import ReportDetail from '@/components/reports/ReportDetail'

export default function ReportDetailPage({ params }: { params: { id: string } }) {
  return <ReportDetail id={params.id} />
}

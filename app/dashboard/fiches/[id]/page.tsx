import FicheDetail from '@/components/fiches/FicheDetail'

export default function FicheDetailPage({ params }: { params: { id: string } }) {
  return <FicheDetail id={params.id} />
}

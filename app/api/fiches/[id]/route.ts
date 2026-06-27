import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFicheById } from '@/lib/notion/client'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fiche = await getFicheById(params.id)
  if (!fiche) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(fiche)
}

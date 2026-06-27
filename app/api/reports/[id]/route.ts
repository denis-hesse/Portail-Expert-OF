import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRapportById } from '@/lib/notion/client'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const report = await getRapportById(params.id)
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(report)
}

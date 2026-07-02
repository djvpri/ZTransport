export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { setUserPref } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { tenantId } = await req.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })

    await setUserPref(session.email, tenantId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

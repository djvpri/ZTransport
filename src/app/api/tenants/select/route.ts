export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isTenantMember, setUserPref } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { tenantId } = await req.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })

    // Wajib: verifikasi keanggotaan dulu, jangan percaya tenantId dari body
    // begitu saja — tanpa ini siapa pun bisa "pilih" PO orang lain.
    if (!(await isTenantMember(tenantId, session.email))) {
      return NextResponse.json({ error: 'Anda bukan anggota PO ini' }, { status: 403 })
    }

    await setUserPref(session.email, tenantId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

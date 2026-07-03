export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isTenantMember } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
    if (!pref) return NextResponse.json({ error: 'Pilih tenant dulu' }, { status: 400 })
    if (!(await isTenantMember(pref.tenantId, session.email))) {
      return NextResponse.json({ error: 'Tidak punya akses ke PO ini' }, { status: 403 })
    }

    const { nama, loket, telepon, alamat } = await req.json()
    await prisma.tenant.update({
      where: { id: pref.tenantId },
      data: {
        ...(nama ? { nama } : {}),
        ...(loket !== undefined ? { loket } : {}),
        ...(telepon !== undefined ? { telepon } : {}),
        ...(alamat !== undefined ? { alamat } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

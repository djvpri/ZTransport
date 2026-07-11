export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getPlanLimits, getTenantPlanInfo } from '@/lib/pricing'
import { isTenantMember } from '@/lib/tenant'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ tenant: null })

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) return NextResponse.json({ tenant: null })

  // Pertahanan berlapis: UserPref seharusnya hanya menunjuk tenant yang user
  // ini anggotanya (dijamin di /api/tenants/select), tapi verifikasi ulang di
  // sini juga — kalau nanti ada fitur "keluarkan member", UserPref lama tidak
  // otomatis diam-diam tetap memberi akses.
  if (!(await isTenantMember(pref.tenantId, session.email))) return NextResponse.json({ tenant: null })

  const t = await prisma.tenant.findUnique({ where: { id: pref.tenantId } })
  if (!t) return NextResponse.json({ tenant: null })

  return NextResponse.json({
    email: session.email,
    tenant: {
      ...t,
      planInfo: getTenantPlanInfo(t),
      limits: getPlanLimits(t.plan, t.planExpires),
    },
  })
}

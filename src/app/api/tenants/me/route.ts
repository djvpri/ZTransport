export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getPlanLimits, getTenantPlanInfo } from '@/lib/pricing'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ tenant: null })

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) return NextResponse.json({ tenant: null })

  const t = await prisma.tenant.findUnique({ where: { id: pref.tenantId } })
  if (!t) return NextResponse.json({ tenant: null })

  return NextResponse.json({
    tenant: {
      ...t,
      planInfo: getTenantPlanInfo(t),
      limits: getPlanLimits(t.plan, t.planExpires),
    },
  })
}

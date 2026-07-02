import { prisma } from './prisma'
import { ZSession } from './session'
import { getPlanLimits, getTenantPlanInfo } from './pricing'

// Resolve tenant untuk user saat ini:
// 1. Jika ada ?tenant=slug di URL → pakai itu (admin/testing override)
// 2. Jika user punya UserPref di DB → pakai tenant terakhir
// 3. Jika user punya 1 tenant → otomatis pakai itu
// 4. Jika tidak ada → return null (redirect ke pemilih tenant)
export async function resolveTenant(req: Request, session: ZSession | null) {
  // Priority 1: explicit ?tenant= slug
  const slugParam = new URL(req.url).searchParams.get('tenant')
  if (slugParam) {
    const t = await prisma.tenant.findUnique({ where: { slug: slugParam } })
    if (t) return t
  }

  if (!session) return null

  // Priority 2: UserPref for this email
  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (pref) {
    const t = await prisma.tenant.findUnique({ where: { id: pref.tenantId } })
    if (t) return t
  }

  // Priority 3: If user only has access to one tenant (via UserPref or all tenants)
  // For now, check if there's exactly one tenant
  const count = await prisma.tenant.count()
  if (count === 1) {
    const t = await prisma.tenant.findFirst()
    if (t) return t
  }

  return null
}

export async function requireTenant(req: Request, session: ZSession | null) {
  const tenant = await resolveTenant(req, session)
  if (!tenant) return null
  return { ...tenant, planInfo: getTenantPlanInfo(tenant), limits: getPlanLimits(tenant.plan, tenant.planExpires) }
}

export async function setUserPref(email: string, tenantId: string) {
  await prisma.userPref.upsert({
    where: { email },
    update: { tenantId },
    create: { email, tenantId },
  })
}

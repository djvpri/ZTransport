import { prisma } from './prisma'
import { ZSession } from './session'
import { getPlanLimits, getTenantPlanInfo } from './pricing'

// Satu-satunya sumber otorisasi akses tenant. Semua kode lain yang perlu
// tahu "apakah user X boleh akses tenant Y" HARUS lewat fungsi ini —
// jangan pernah percaya begitu saja ?tenant=slug atau tenantId dari body
// request, karena itu sepenuhnya dikendalikan client.
export async function isTenantMember(tenantId: string, email: string): Promise<boolean> {
  const m = await prisma.tenantMember.findUnique({
    where: { tenantId_email: { tenantId, email } },
  })
  return !!m
}

// Resolve tenant untuk user saat ini — HANYA tenant yang dia memang anggotanya:
// 1. ?tenant=slug di URL, TAPI hanya dipakai kalau user terverifikasi member
//    tenant itu (switch eksplisit antar PO, untuk staf multi-PO nanti)
// 2. UserPref (tenant terakhir dipilih), divalidasi ulang keanggotaannya
//    (bukan sekadar dipercaya — keanggotaan bisa dicabut di masa depan)
// 3. Kalau tidak ada satu pun yang valid → null (redirect ke /pilih-tenant)
//
// PENTING: tidak ada lagi fallback "kalau cuma ada 1 tenant di seluruh
// sistem, otomatis pakai itu" — itu bypass otorisasi total begitu ada
// lebih dari satu PO terdaftar (yang justru itulah tujuan sistem plan/SaaS).
export async function resolveTenant(req: Request, session: ZSession | null) {
  if (!session) return null

  const slugParam = new URL(req.url).searchParams.get('tenant')
  if (slugParam) {
    const t = await prisma.tenant.findUnique({ where: { slug: slugParam } })
    if (t && (await isTenantMember(t.id, session.email))) return t
    // Slug diberikan tapi user BUKAN member tenant itu — jangan diam-diam
    // fallback ke tenant lain, supaya percobaan akses tenant orang lain
    // gagal jelas (null → 403/404 di caller), bukan menyamar sukses.
    return null
  }

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (pref) {
    const t = await prisma.tenant.findUnique({ where: { id: pref.tenantId } })
    if (t && (await isTenantMember(t.id, session.email))) return t
  }

  return null
}

export async function requireTenant(req: Request, session: ZSession | null) {
  const tenant = await resolveTenant(req, session)
  if (!tenant) return null
  return { ...tenant, planInfo: getTenantPlanInfo(tenant), limits: getPlanLimits(tenant.plan, tenant.planExpires) }
}

// Hanya dipanggil SETELAH keanggotaan terverifikasi (mis. di /api/tenants/select).
export async function setUserPref(email: string, tenantId: string) {
  await prisma.userPref.upsert({
    where: { email },
    update: { tenantId },
    create: { email, tenantId },
  })
}

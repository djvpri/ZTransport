import { prisma } from './prisma'

// Ambil tenant dari query ?tenant=slug (default kapuas-raya). Nanti bisa
// diganti ambil dari preferensi user / business_id di SSO.
export async function resolveTenant(req: Request) {
  const slug = new URL(req.url).searchParams.get('tenant') || 'kapuas-raya'
  return prisma.tenant.findUnique({ where: { slug } })
}

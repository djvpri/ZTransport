export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

// Hanya kembalikan tenant yang user ini benar-benar anggotanya — BUKAN
// semua tenant di sistem (itu bug lama: siapa pun akun ekosistem bisa
// lihat & pilih PO orang lain).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.tenantMember.findMany({
    where: { email: session.email },
    include: { tenant: { select: { id: true, nama: true, loket: true, plan: true, telepon: true, isActive: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ tenants: memberships.map((m) => m.tenant) })
}

// Buat PO baru (self-serve). Pembuat otomatis jadi owner member — tanpa ini,
// tenant baru akan langsung tidak bisa diakses siapa pun (termasuk pembuatnya).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, slug } = await req.json()
    if (!name || !name.trim()) return NextResponse.json({ error: 'Nama PO wajib diisi' }, { status: 400 })

    let finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')).trim()
    if (!finalSlug) finalSlug = 'po'
    let counter = 1
    while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) finalSlug = `${slug || 'po'}-${counter++}`

    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({ data: { nama: name.trim(), slug: finalSlug, plan: 'free' } })
      await tx.tenantMember.create({ data: { tenantId: t.id, email: session.email, role: 'owner' } })
      return t
    })

    return NextResponse.json({ success: true, tenant: { id: tenant.id, nama: tenant.nama, slug: tenant.slug } }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

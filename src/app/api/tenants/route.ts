export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await prisma.tenant.findMany({
    select: { id: true, nama: true, loket: true, plan: true, telepon: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ tenants })
}

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

    const tenant = await prisma.tenant.create({
      data: { nama: name.trim(), slug: finalSlug, plan: 'free' },
    })

    return NextResponse.json({ success: true, tenant: { id: tenant.id, nama: tenant.nama, slug: tenant.slug } }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

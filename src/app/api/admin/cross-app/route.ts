export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCrossAppSecret } from '@/lib/secrets'

function checkAuth(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  return token === getCrossAppSecret()
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.nama,
        plan: t.plan,
        active: t.isActive,
        expires_at: t.planExpires,
      })),
      users: [], // ZTransport tidak punya User model — SSO via ZOne
    })
  } catch (error) {
    console.error('Cross-app GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, email, data } = await req.json()

    // --- Tenant actions ---
    if (action === 'createTenant') {
      const name = String(data?.name || '').trim()
      if (!name) return NextResponse.json({ error: 'name wajib diisi' }, { status: 400 })
      let slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
      if (!slug) slug = 'po'
      let finalSlug = slug
      let counter = 1
      while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) finalSlug = `${slug}-${counter++}`
      const tenant = await prisma.tenant.create({ data: { nama: name, slug: finalSlug } })
      return NextResponse.json({ success: true, tenant: { id: tenant.id, name: tenant.nama } }, { status: 201 })
    }

    if (action === 'updateTenant') {
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      await prisma.tenant.update({
        where: { id: data.tenantId },
        data: { nama: data.name || undefined },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'deleteTenant') {
      // Soft-delete: tidak ada isActive di Tenant, hanya hapus data teknis
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      // Hapus semua data terkait tenant
      const trips = await prisma.trip.findMany({ where: { tenantId: data.tenantId }, select: { id: true } })
      const tripIds = trips.map(t => t.id)
      await prisma.paket.deleteMany({ where: { tripId: { in: tripIds } } })
      await prisma.tiket.deleteMany({ where: { tripId: { in: tripIds } } })
      await prisma.booking.deleteMany({ where: { tenantId: data.tenantId } })
      await prisma.trip.deleteMany({ where: { tenantId: data.tenantId } })
      await prisma.jadwal.deleteMany({ where: { tenantId: data.tenantId } })
      await prisma.tarif.deleteMany({ where: { rute: { tenantId: data.tenantId } } })
      await prisma.titikHenti.deleteMany({ where: { rute: { tenantId: data.tenantId } } })
      await prisma.rute.deleteMany({ where: { tenantId: data.tenantId } })
      await prisma.bus.deleteMany({ where: { tenantId: data.tenantId } })
      await prisma.tenant.delete({ where: { id: data.tenantId } })
      return NextResponse.json({ success: true, deleted: true })
    }

    // ZTransport tidak punya User model — user dikelola via ZOne
    // ZTransport sekarang punya plan/isActive
    if (action === 'updatePlan') {
      if (!data?.tenantId || !data?.plan) return NextResponse.json({ error: 'tenantId & plan wajib' }, { status: 400 })
      await prisma.tenant.update({
        where: { id: data.tenantId },
        data: {
          plan: data.plan,
          planExpires: data.planExpires ? new Date(data.planExpires) : null,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'reactivateTenant') {
      if (!data?.tenantId) return NextResponse.json({ error: 'tenantId wajib' }, { status: 400 })
      await prisma.tenant.update({
        where: { id: data.tenantId },
        data: { isActive: true },
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Cross-app POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

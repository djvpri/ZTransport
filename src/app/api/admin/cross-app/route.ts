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

    const members = await prisma.tenantMember.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.nama,
        plan: t.plan,
        active: t.isActive,
        expires_at: t.planExpires,
      })),
      // ZTransport SSO-only: "user" = anggota tenant (TenantMember). Password
      // tidak disimpan di sini (login lewat SSO ZOne).
      users: members.map(m => ({ id: m.id, email: m.email, tenantId: m.tenantId, role: m.role, active: true })),
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

    // --- User (anggota tenant) actions ---
    // ZTransport SSO-only (tak ada User/password lokal). "Tambah user" dari ZOne
    // = jadikan email itu anggota (TenantMember) sebuah PO. Password diabaikan.
    if (action === 'create') {
      const em = String(email || data?.email || '').trim().toLowerCase()
      if (!em) return NextResponse.json({ error: 'email wajib' }, { status: 400 })
      const tenantId = data?.tenantId ? String(data.tenantId) : null
      if (!tenantId) {
        // Tanpa PO tak ada keanggotaan yang bisa dibuat (akses login diatur di
        // ZOne). Bukan error — supaya toggle akses di ZOne tidak gagal.
        return NextResponse.json({ success: true, note: 'Akses SSO diatur di ZOne; pilih PO untuk memberi keanggotaan.' })
      }
      const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
      if (!t) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
      await prisma.tenantMember.upsert({
        where: { tenantId_email: { tenantId, email: em } },
        update: {},
        create: { tenantId, email: em, role: 'owner' },
      })
      return NextResponse.json({ success: true, member: { email: em, tenantId } }, { status: 201 })
    }

    // moveTenant / hapus user belum didukung di ZTransport (bisa lewat
    // Settings > Kelola Anggota di app-nya). Tambahkan di sini bila perlu.
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Cross-app POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

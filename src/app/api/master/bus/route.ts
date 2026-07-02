import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'
import { enforceBusLimit } from '@/lib/enforce'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
  const bus = await prisma.bus.findMany({ where: { tenantId: tenant.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ bus })
}

export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  // Plan enforcement
  const check = await enforceBusLimit(tenant.id)
  if (!check.allowed) return NextResponse.json({ error: check.reason, limit: check.limit, current: check.current }, { status: 403 })

  const b = await req.json()
  if (!b.nama || !b.plat) return NextResponse.json({ error: 'Nama & plat wajib' }, { status: 400 })
  const bus = await prisma.bus.create({
    data: {
      tenantId: tenant.id,
      nama: b.nama, plat: b.plat,
      kelas: b.kelas || 'EKONOMI',
      layout: b.layout || '2-2',
      totalKursi: Number(b.totalKursi || 32),
    },
  })
  return NextResponse.json({ success: true, bus })
}

export async function PATCH(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await req.json()
  if (!b.id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  const bus = await prisma.bus.update({
    where: { id: b.id },
    data: {
      ...(b.nama !== undefined && { nama: b.nama }),
      ...(b.plat !== undefined && { plat: b.plat }),
      ...(b.kelas !== undefined && { kelas: b.kelas }),
      ...(b.layout !== undefined && { layout: b.layout }),
      ...(b.totalKursi !== undefined && { totalKursi: Number(b.totalKursi) }),
      ...(b.aktif !== undefined && { aktif: b.aktif }),
    },
  })
  return NextResponse.json({ success: true, bus })
}

export async function DELETE(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  try {
    await prisma.bus.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    // Kalau sudah dipakai jadwal/trip, jangan hapus — nonaktifkan saja.
    await prisma.bus.update({ where: { id }, data: { aktif: false } })
    return NextResponse.json({ success: true, dinonaktifkan: true })
  }
}

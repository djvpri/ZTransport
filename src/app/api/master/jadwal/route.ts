import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
  const jadwal = await prisma.jadwal.findMany({
    where: { tenantId: tenant.id },
    include: { rute: true, bus: true },
    orderBy: { jam: 'asc' },
  })
  return NextResponse.json({
    jadwal: jadwal.map((j: any) => ({
      id: j.id, jam: j.jam, hari: j.hari, aktif: j.aktif,
      rute: `${j.rute.asal} → ${j.rute.tujuan}`, ruteId: j.ruteId,
      bus: j.bus.nama, busId: j.busId,
    })),
  })
}

// body: { ruteId, busId, jam, hari?: HariMinggu[] }  (hari kosong = tiap hari)
export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
  const b = await req.json()
  if (!b.ruteId || !b.busId || !b.jam) return NextResponse.json({ error: 'Rute, bus, dan jam wajib' }, { status: 400 })
  const jadwal = await prisma.jadwal.create({
    data: { tenantId: tenant.id, ruteId: b.ruteId, busId: b.busId, jam: b.jam, hari: b.hari || [] },
  })
  return NextResponse.json({ success: true, id: jadwal.id })
}

export async function DELETE(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  try {
    await prisma.jadwal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    await prisma.jadwal.update({ where: { id }, data: { aktif: false } })
    return NextResponse.json({ success: true, dinonaktifkan: true })
  }
}

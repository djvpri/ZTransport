import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// GET /api/trip — daftar trip hari ini & mendatang (untuk memilih trip saat
// menitipkan kargo di loket).
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const trips = await prisma.trip.findMany({
    where: { tenantId: tenant.id, tanggal: { gte: today }, status: { not: 'BATAL' } },
    include: { rute: { select: { asal: true, tujuan: true } }, bus: { select: { nama: true } } },
    orderBy: [{ tanggal: 'asc' }, { jam: 'asc' }],
    take: 40,
  })
  return NextResponse.json({
    trips: trips.map((t: any) => ({
      id: t.id,
      tanggal: t.tanggal,
      jam: t.jam,
      rute: `${t.rute.asal} → ${t.rute.tujuan}`,
      bus: t.bus.nama,
    })),
  })
}

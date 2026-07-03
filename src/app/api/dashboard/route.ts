import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// Ringkasan dashboard: trip hari ini + statistik.
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const besok = new Date(today); besok.setDate(besok.getDate() + 1)

  const trips = await prisma.trip.findMany({
    where: { tenantId: tenant.id, tanggal: today },
    include: {
      rute: { include: { titik: { orderBy: { urutan: 'asc' } } } },
      bus: true,
      _count: { select: { tiket: true } },
    },
    orderBy: { jam: 'asc' },
  })

  const tripView = trips.map((t: any) => ({
    id: t.id,
    jam: t.jam,
    dari: t.rute.asal,
    ke: t.rute.tujuan,
    via: t.rute.titik.slice(1, -1).map((x: any) => x.nama).join(' · ') || '-',
    bus: t.bus.nama,
    plat: t.bus.plat,
    sopir: t.sopir || '-',
    terisi: t._count.tiket,
    total: t.bus.totalKursi,
    status: t.status.toLowerCase(),
  }))

  // Statistik hari ini
  const bookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id, createdAt: { gte: today, lt: besok } },
    select: { totalHarga: true, _count: { select: { tiket: true } } },
  })
  const pendapatan = bookings.reduce((s: number, b: any) => s + Number(b.totalHarga), 0)
  const tiketTerjual = tripView.reduce((s: number, t: any) => s + t.terisi, 0)
  const totalKursi = tripView.reduce((s: number, t: any) => s + t.total, 0)
  const okupansi = totalKursi ? Math.round((tiketTerjual / totalKursi) * 100) : 0
  const paketMenunggu = await prisma.paket.count({ where: { tenantId: tenant.id, status: 'SAMPAI' } })

  return NextResponse.json({
    tenant: { nama: tenant.nama, loket: tenant.loket, slug: tenant.slug },
    kasir: session.name,
    stat: { pendapatan, tiketTerjual, totalKursi, okupansi, paketMenunggu },
    trips: tripView,
  })
}

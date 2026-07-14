import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'
import { getPlanLimits } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

function ymd(d: Date) { return d.toISOString().slice(0, 10) }

// GET /api/laporan?from=YYYY-MM-DD&to=YYYY-MM-DD
// Rekap pendapatan (tiket + paket) rentang tanggal, breakdown per hari / rute /
// bus / channel. Pendapatan tiket dihitung dari Booking (createdAt = waktu jual),
// konsisten dengan statistik dashboard.
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const url = new URL(req.url)
  const now = new Date()
  const defFrom = new Date(now); defFrom.setDate(defFrom.getDate() - 29)
  const fromStr = url.searchParams.get('from') || ymd(defFrom)
  const toStr = url.searchParams.get('to') || ymd(now)
  const fromDate = new Date(fromStr + 'T00:00:00.000Z')
  const toExclusive = new Date(toStr + 'T00:00:00.000Z'); toExclusive.setUTCDate(toExclusive.getUTCDate() + 1)

  const bookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id, createdAt: { gte: fromDate, lt: toExclusive } },
    select: {
      totalHarga: true, channel: true, metodeBayar: true, createdAt: true,
      _count: { select: { tiket: true } },
      trip: { select: { rute: { select: { nama: true } }, bus: { select: { nama: true } } } },
    },
  })
  const paket = await prisma.paket.findMany({
    where: { tenantId: tenant.id, createdAt: { gte: fromDate, lt: toExclusive } },
    select: { tarif: true, statusBayar: true, metodeBayar: true },
  })

  let pendapatanTiket = 0, jumlahTiket = 0
  const perHari: Record<string, { pendapatan: number; tiket: number; booking: number }> = {}
  const perRute: Record<string, { pendapatan: number; tiket: number }> = {}
  const perBus: Record<string, { pendapatan: number; tiket: number }> = {}
  const perChannel: Record<string, { pendapatan: number; booking: number }> = {}
  const perMetode: Record<string, { pendapatan: number; jumlah: number }> = {}

  for (const b of bookings) {
    const harga = Number(b.totalHarga)
    const tk = b._count.tiket
    pendapatanTiket += harga
    jumlahTiket += tk

    const hari = b.createdAt.toISOString().slice(0, 10)
    if (!perHari[hari]) perHari[hari] = { pendapatan: 0, tiket: 0, booking: 0 }
    perHari[hari].pendapatan += harga; perHari[hari].tiket += tk; perHari[hari].booking += 1

    const rute = b.trip?.rute?.nama || '(tanpa rute)'
    if (!perRute[rute]) perRute[rute] = { pendapatan: 0, tiket: 0 }
    perRute[rute].pendapatan += harga; perRute[rute].tiket += tk

    const bus = b.trip?.bus?.nama || '(tanpa bus)'
    if (!perBus[bus]) perBus[bus] = { pendapatan: 0, tiket: 0 }
    perBus[bus].pendapatan += harga; perBus[bus].tiket += tk

    const ch = b.channel
    if (!perChannel[ch]) perChannel[ch] = { pendapatan: 0, booking: 0 }
    perChannel[ch].pendapatan += harga; perChannel[ch].booking += 1

    if (b.metodeBayar) {
      if (!perMetode[b.metodeBayar]) perMetode[b.metodeBayar] = { pendapatan: 0, jumlah: 0 }
      perMetode[b.metodeBayar].pendapatan += harga; perMetode[b.metodeBayar].jumlah += 1
    }
  }

  const pendapatanPaket = paket.reduce((s, p) => s + Number(p.tarif), 0)
  // Rekonsiliasi metode bayar: gabung tiket + paket yang sudah LUNAS & bermetode.
  for (const p of paket) {
    if (p.statusBayar === 'LUNAS' && p.metodeBayar) {
      if (!perMetode[p.metodeBayar]) perMetode[p.metodeBayar] = { pendapatan: 0, jumlah: 0 }
      perMetode[p.metodeBayar].pendapatan += Number(p.tarif); perMetode[p.metodeBayar].jumlah += 1
    }
  }
  const limits = getPlanLimits(tenant.plan, tenant.planExpires)

  return NextResponse.json({
    po: tenant.nama,
    range: { from: fromStr, to: toStr },
    summary: {
      pendapatanTiket,
      pendapatanPaket,
      total: pendapatanTiket + pendapatanPaket,
      jumlahBooking: bookings.length,
      jumlahTiket,
      jumlahPaket: paket.length,
    },
    perHari: Object.entries(perHari).map(([tanggal, v]) => ({ tanggal, ...v })).sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)),
    perRute: Object.entries(perRute).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.pendapatan - a.pendapatan),
    perBus: Object.entries(perBus).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.pendapatan - a.pendapatan),
    perChannel: Object.entries(perChannel).map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.pendapatan - a.pendapatan),
    perMetode: Object.entries(perMetode).map(([metode, v]) => ({ metode, ...v })).sort((a, b) => b.pendapatan - a.pendapatan),
    eksporLaporan: limits.eksporLaporan,
  })
}

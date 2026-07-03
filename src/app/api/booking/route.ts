import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { kodeBooking } from '@/lib/seat'
import { enforceBookingLimit } from '@/lib/enforce'

export const dynamic = 'force-dynamic'

// POST /api/booking — buat booking + tiket. Kursi dikunci lewat unique
// (tripId, kursi): kalau ada yang keburu ambil kursi sama, transaksi gagal
// (P2002) dan kita balikin 409 supaya kasir pilih ulang. Semua tiket dalam
// satu booking dibuat dalam satu transaksi — all-or-nothing.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { tripId, penumpang, channel, metodeBayar, hpPemesan, namaPemesan } = body
    // penumpang: [{ kursi, nama, hp?, turunDi?, harga }]

    if (!tripId || !Array.isArray(penumpang) || penumpang.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { bus: true } })
    if (!trip) return NextResponse.json({ error: 'Trip tidak ditemukan' }, { status: 404 })
    if (trip.status === 'BERANGKAT' || trip.status === 'BATAL') {
      return NextResponse.json({ error: 'Trip sudah berangkat/batal' }, { status: 409 })
    }

    // Plan enforcement — baru bisa dicek setelah tenantId diketahui dari trip
    const check = await enforceBookingLimit(trip.tenantId, new Date())
    if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 403 })

    const total = penumpang.reduce((s: number, p: any) => s + Number(p.harga || 0), 0)
    const kode = kodeBooking('B')

    const result = await prisma.$transaction(async (tx: any) => {
      const booking = await tx.booking.create({
        data: {
          tenantId: trip.tenantId,
          tripId,
          kode,
          namaPemesan: namaPemesan || penumpang[0].nama,
          hpPemesan: hpPemesan || penumpang[0].hp || null,
          channel: channel || 'LOKET',
          totalHarga: total,
          statusBayar: 'LUNAS',
          metodeBayar: metodeBayar || 'TUNAI',
          createdBy: session.email,
        },
      })

      for (const p of penumpang) {
        await tx.tiket.create({
          data: {
            bookingId: booking.id,
            tripId,
            kursi: String(p.kursi),
            namaPenumpang: p.nama,
            hpPenumpang: p.hp || null,
            turunDi: p.turunDi || trip.ruteId, // nama titik turun
            harga: Number(p.harga || 0),
            kode: kodeBooking('T'),
          },
        })
      }

      // Update status trip → PENUH kalau semua kursi terisi
      const jml = await tx.tiket.count({ where: { tripId } })
      if (jml >= trip.bus.totalKursi) {
        await tx.trip.update({ where: { id: tripId }, data: { status: 'PENUH' } })
      }

      return booking
    })

    return NextResponse.json({ success: true, kode: result.kode, bookingId: result.id })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Kursi baru saja dipesan orang lain. Silakan pilih kursi lain.' }, { status: 409 })
    }
    console.error('Booking error:', e)
    return NextResponse.json({ error: e.message || 'Gagal membuat booking' }, { status: 500 })
  }
}

// GET /api/booking?kode=BXXXXX — untuk halaman cetak tiket
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kode = new URL(req.url).searchParams.get('kode')
  if (!kode) return NextResponse.json({ error: 'kode wajib' }, { status: 400 })

  const booking = await prisma.booking.findUnique({
    where: { kode },
    include: {
      tiket: true,
      trip: { include: { rute: true, bus: true } },
      tenant: true,
    },
  })
  if (!booking) return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    kode: booking.kode,
    po: booking.tenant.nama,
    loket: booking.tenant.loket,
    tanggal: booking.trip.tanggal,
    jam: booking.trip.jam,
    rute: `${booking.trip.rute.asal} → ${booking.trip.rute.tujuan}`,
    bus: booking.trip.bus.nama,
    plat: booking.trip.bus.plat,
    total: Number(booking.totalHarga),
    metodeBayar: booking.metodeBayar,
    tiket: booking.tiket.map((t: any) => ({
      kode: t.kode, kursi: t.kursi, nama: t.namaPenumpang,
      turunDi: t.turunDi, harga: Number(t.harga),
    })),
  })
}

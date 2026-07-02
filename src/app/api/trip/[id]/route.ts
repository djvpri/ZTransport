import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { buildSeatLayout } from '@/lib/seat'

export const dynamic = 'force-dynamic'

// Detail trip untuk layar jual tiket: layout kursi + kursi yang sudah terisi + tarif.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      bus: true,
      rute: { include: { titik: { orderBy: { urutan: 'asc' } }, tarif: true } },
      tiket: { select: { kursi: true, namaPenumpang: true, statusBoarding: true } },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Trip tidak ditemukan' }, { status: 404 })

  const layout = buildSeatLayout(trip.bus.layout, trip.bus.totalKursi)
  const terisi = Object.fromEntries(trip.tiket.map((t: any) => [t.kursi, t.namaPenumpang]))
  const tarifPenuh = trip.rute.tarif.find((x: any) => x.ke === trip.rute.tujuan)?.harga ?? trip.rute.tarif[0]?.harga ?? 0

  return NextResponse.json({
    trip: {
      id: trip.id, jam: trip.jam, tanggal: trip.tanggal,
      dari: trip.rute.asal, ke: trip.rute.tujuan, status: trip.status,
      bus: trip.bus.nama, plat: trip.bus.plat, layout: trip.bus.layout,
      sopir: trip.sopir,
    },
    titik: trip.rute.titik.map((t: any) => t.nama),
    tarif: Number(tarifPenuh),
    tarifSegmen: trip.rute.tarif.map((t: any) => ({ dari: t.dari, ke: t.ke, harga: Number(t.harga) })),
    seatRows: layout.rows,
    perRow: layout.perRow,
    terisi,
  })
}

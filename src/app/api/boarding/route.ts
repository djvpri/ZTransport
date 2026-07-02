import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/boarding — kernet scan QR tiket. Body: { kode }.
// Tandai BOARDED. Kalau sudah pernah boarded, tolak (cegah tiket dipakai 2x).
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { kode } = await req.json()
  if (!kode) return NextResponse.json({ error: 'kode tiket wajib' }, { status: 400 })

  const tiket = await prisma.tiket.findUnique({
    where: { kode },
    include: { trip: { include: { rute: true } } },
  })
  if (!tiket) return NextResponse.json({ valid: false, error: 'Tiket tidak ditemukan' }, { status: 404 })

  if (tiket.statusBoarding === 'BOARDED') {
    return NextResponse.json({
      valid: false, error: 'Tiket sudah dipakai boarding',
      penumpang: tiket.namaPenumpang, kursi: tiket.kursi, boardedAt: tiket.boardedAt,
    }, { status: 409 })
  }

  await prisma.tiket.update({
    where: { kode },
    data: { statusBoarding: 'BOARDED', boardedAt: new Date() },
  })

  return NextResponse.json({
    valid: true,
    penumpang: tiket.namaPenumpang,
    kursi: tiket.kursi,
    turunDi: tiket.turunDi,
    rute: `${tiket.trip.rute.asal} → ${tiket.trip.rute.tujuan}`,
  })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

const HARI = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'] as const

// POST /api/master/generate-trip  body: { tanggal?: 'YYYY-MM-DD' }
// Buat Trip untuk semua jadwal aktif yang berlaku di tanggal itu.
// Idempoten: unique (jadwalId, tanggal) mencegah duplikat, jadi aman diulang.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const tgl = body.tanggal ? new Date(body.tanggal) : new Date()
  tgl.setHours(0, 0, 0, 0)
  const namaHari = HARI[tgl.getDay()]

  const jadwals = await prisma.jadwal.findMany({
    where: { tenantId: tenant.id, aktif: true },
  })

  let dibuat = 0, dilewati = 0
  for (const j of jadwals) {
    // hari kosong = berlaku tiap hari; kalau ada isinya, cek apakah namaHari termasuk
    if (j.hari.length > 0 && !j.hari.includes(namaHari as any)) continue
    try {
      await prisma.trip.create({
        data: {
          tenantId: tenant.id, jadwalId: j.id, ruteId: j.ruteId, busId: j.busId,
          tanggal: tgl, jam: j.jam,
        },
      })
      dibuat++
    } catch (e: any) {
      if (e?.code === 'P2002') dilewati++ // sudah ada
      else throw e
    }
  }

  return NextResponse.json({ success: true, tanggal: tgl.toISOString().slice(0, 10), dibuat, dilewati })
}

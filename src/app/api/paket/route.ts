import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { kodeBooking } from '@/lib/seat'

export const dynamic = 'force-dynamic'

// GET /api/paket?tenant=slug — daftar paket (kargo titipan)
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const slug = new URL(req.url).searchParams.get('tenant') || 'kapuas-raya'
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const paket = await prisma.paket.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ paket: paket.map((p: any) => ({ ...p, tarif: Number(p.tarif), berat: p.berat ? Number(p.berat) : null })) })
}

// POST /api/paket — terima kargo baru, hasilkan resi
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const b = await req.json()
    const slug = b.tenant || 'kapuas-raya'
    const tenant = await prisma.tenant.findUnique({ where: { slug } })
    if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

    const paket = await prisma.paket.create({
      data: {
        tenantId: tenant.id,
        tripId: b.tripId || null,
        resi: kodeBooking('P'),
        pengirim: b.pengirim,
        hpPengirim: b.hpPengirim || null,
        penerima: b.penerima,
        hpPenerima: b.hpPenerima || null,
        tujuan: b.tujuan,
        isi: b.isi || null,
        berat: b.berat ? Number(b.berat) : null,
        koli: Number(b.koli || 1),
        tarif: Number(b.tarif || 0),
        createdBy: session.email,
      },
    })
    return NextResponse.json({ success: true, resi: paket.resi })
  } catch (e: any) {
    console.error('Paket error:', e)
    return NextResponse.json({ error: e.message || 'Gagal simpan paket' }, { status: 500 })
  }
}

// PATCH /api/paket — ubah status (DITERIMA/DIKIRIM/SAMPAI/DIAMBIL)
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { resi, status } = await req.json()
  if (!resi || !status) return NextResponse.json({ error: 'resi & status wajib' }, { status: 400 })
  await prisma.paket.update({ where: { resi }, data: { status } })
  return NextResponse.json({ success: true })
}

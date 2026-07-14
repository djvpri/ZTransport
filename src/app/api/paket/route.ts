import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { kodeBooking } from '@/lib/seat'
import { resolveTenant, isTenantMember } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

// GET /api/paket — daftar paket (kargo titipan) milik tenant aktif user
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  const paket = await prisma.paket.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ po: tenant.nama, paket: paket.map((p: any) => ({ ...p, tarif: Number(p.tarif), berat: p.berat ? Number(p.berat) : null })) })
}

// POST /api/paket — terima kargo baru, hasilkan resi
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const tenant = await resolveTenant(req, session)
    if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

    const b = await req.json()
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
        statusBayar: b.statusBayar === 'BELUM' ? 'BELUM' : 'LUNAS',
        metodeBayar: b.statusBayar === 'BELUM' ? null : (b.metodeBayar || 'TUNAI'),
        createdBy: session.email,
      },
    })
    return NextResponse.json({ success: true, resi: paket.resi })
  } catch (e: any) {
    console.error('Paket error:', e)
    return NextResponse.json({ error: e.message || 'Gagal simpan paket' }, { status: 500 })
  }
}

// PATCH /api/paket — ubah status (DITERIMA/DIKIRIM/SAMPAI/DIAMBIL).
// Wajib verifikasi paket ini milik tenant yang usernya anggota — tanpa ini,
// siapa pun yang tahu kode resi bisa ubah status paket PO lain.
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { resi, status, statusBayar, metodeBayar } = await req.json()
  if (!resi || (!status && !statusBayar)) return NextResponse.json({ error: 'resi & (status/statusBayar) wajib' }, { status: 400 })

  const paket = await prisma.paket.findUnique({ where: { resi } })
  if (!paket) return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 404 })
  if (!(await isTenantMember(paket.tenantId, session.email))) {
    return NextResponse.json({ error: 'Tidak punya akses ke paket ini' }, { status: 403 })
  }

  const data: any = {}
  if (status) data.status = status
  if (statusBayar) {
    data.statusBayar = statusBayar
    if (statusBayar === 'LUNAS') data.metodeBayar = metodeBayar || 'TUNAI'
    if (statusBayar === 'BELUM') data.metodeBayar = null
  }
  await prisma.paket.update({ where: { resi }, data })
  return NextResponse.json({ success: true })
}

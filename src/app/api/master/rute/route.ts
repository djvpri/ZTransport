import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'
import { enforceRuteLimit } from '@/lib/enforce'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
  const rute = await prisma.rute.findMany({
    where: { tenantId: tenant.id },
    include: { titik: { orderBy: { urutan: 'asc' } }, tarif: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    rute: rute.map((r: any) => ({
      id: r.id, nama: r.nama, asal: r.asal, tujuan: r.tujuan, aktif: r.aktif,
      titik: r.titik.map((t: any) => t.nama),
      tarif: r.tarif.map((t: any) => ({ dari: t.dari, ke: t.ke, harga: Number(t.harga) })),
    })),
  })
}

// Buat rute + titik henti + tarif per segmen dalam satu transaksi.
// body: { nama?, titik: string[] (min 2), tarif: [{ dari, ke, harga }] }
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  // Plan enforcement
  const check = await enforceRuteLimit(tenant.id)
  if (!check.allowed) return NextResponse.json({ error: check.reason, limit: check.limit, current: check.current }, { status: 403 })

  const b = await req.json()
  const titik: string[] = (b.titik || []).map((t: string) => t.trim()).filter(Boolean)
  if (titik.length < 2) return NextResponse.json({ error: 'Minimal 2 titik (asal & tujuan)' }, { status: 400 })

  const asal = titik[0], tujuan = titik[titik.length - 1]
  const nama = b.nama?.trim() || `${asal} - ${tujuan}`
  const tarif: { dari: string; ke: string; harga: number }[] = (b.tarif || []).filter((t: any) => t.ke && Number(t.harga) > 0)
  if (tarif.length === 0) return NextResponse.json({ error: 'Isi minimal 1 tarif' }, { status: 400 })

  const rute = await prisma.$transaction(async (tx: any) => {
    const r = await tx.rute.create({ data: { tenantId: tenant.id, nama, asal, tujuan } })
    await tx.titikHenti.createMany({ data: titik.map((n, i) => ({ ruteId: r.id, nama: n, kota: n, urutan: i })) })
    await tx.tarif.createMany({ data: tarif.map((t) => ({ ruteId: r.id, dari: t.dari || asal, ke: t.ke, harga: t.harga })) })
    return r
  })
  return NextResponse.json({ success: true, id: rute.id })
}

export async function DELETE(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib' }, { status: 400 })
  try {
    await prisma.rute.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    await prisma.rute.update({ where: { id }, data: { aktif: false } })
    return NextResponse.json({ success: true, dinonaktifkan: true })
  }
}

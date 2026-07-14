import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDemoResetSecret } from '@/lib/secrets'
import { seedDataDemo, bersihkanDataToko } from '@/lib/demo-seed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Dipanggil Railway Cron Job (SATU cron untuk banyak app, lewat
// DEMO_RESET_TARGETS) — BUKAN oleh sesi user. Proteksinya secret di header
// Authorization: Bearer <DEMO_RESET_SECRET>, bukan cookie SSO.
//
// Tenant demo dicari lewat flag isDemo=true (bukan hardcode email/slug),
// jadi kalau demo dipindah ke tenant lain cukup pindahkan flag-nya.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')

  let cocok: boolean
  try {
    cocok = token === getDemoResetSecret()
  } catch {
    cocok = false // secret belum di-set -> fail-closed, tolak semua
  }
  if (!cocok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenants = await prisma.tenant.findMany({ where: { isDemo: true }, select: { id: true, nama: true } })
  if (tenants.length === 0) {
    return NextResponse.json({ ok: true, pesan: 'Tidak ada tenant demo (isDemo=true belum di-set).' })
  }

  const hasil: { tenantId: string; nama: string }[] = []
  for (const t of tenants) {
    await bersihkanDataToko(t.id)
    await seedDataDemo(t.id)
    hasil.push({ tenantId: t.id, nama: t.nama })
  }

  return NextResponse.json({ ok: true, direset: hasil })
}

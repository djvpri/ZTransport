import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { resolveTenant } from '@/lib/tenant'
import { seedDataDemo, bersihkanDataToko } from '@/lib/demo-seed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/demo/reset — tombol "Reset Demo" manual saat user sedang eksplor.
// Beda dari /reset-daily (cron, secret header): ini pakai session SSO biasa,
// TAPI dengan pengecekan KRUSIAL di bawah.
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await resolveTenant(req, session)
  if (!tenant) return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })

  // KRUSIAL: cuma tenant demo yang boleh direset lewat sini. Tanpa cek ini,
  // endpoint bisa dipakai untuk menghapus SELURUH data PO ASLI siapa pun yang
  // sedang login.
  if (!tenant.isDemo) {
    return NextResponse.json({ error: 'Bukan tenant demo, tidak bisa direset lewat sini' }, { status: 403 })
  }

  await bersihkanDataToko(tenant.id)
  await seedDataDemo(tenant.id)
  return NextResponse.json({ ok: true })
}

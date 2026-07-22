import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { issueSessionCookie, SESSION_COOKIE } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/demo/login — masuk sebagai akun demo TANPA SSO (untuk tombol
// "Coba Demo" di landing). HANYA menyentuh tenant demo (isDemo=true); tak
// pernah bisa dipakai masuk ke tenant/PO asli.
export async function GET(req: Request) {
  const email = process.env.DEMO_EMAIL || 'demo@zomet.my.id'
  const tenant = await prisma.tenant.findFirst({ where: { isDemo: true }, orderBy: { createdAt: 'asc' } })

  // Tanpa tenant demo, jatuhkan ke login SSO biasa.
  if (!tenant) return NextResponse.redirect(new URL('/login', req.url))

  // Pastikan email demo jadi anggota tenant demo + preferensi tenant mengarah
  // ke sana, supaya halaman utama langsung menampilkan dashboard demo.
  await prisma.tenantMember.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: {},
    create: { tenantId: tenant.id, email, role: 'owner', nama: 'Akun Demo' },
  })
  await prisma.userPref.upsert({
    where: { email },
    update: { tenantId: tenant.id },
    create: { email, tenantId: tenant.id },
  })

  const token = issueSessionCookie({ sub: 'demo', email, name: 'Akun Demo' })
  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

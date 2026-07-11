export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isTenantMember } from '@/lib/tenant'

// List member
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) return NextResponse.json({ error: 'Pilih tenant dulu' }, { status: 400 })
  if (!(await isTenantMember(pref.tenantId, session.email))) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const members = await prisma.tenantMember.findMany({
    where: { tenantId: pref.tenantId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ members })
}

// Tambah member
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) return NextResponse.json({ error: 'Pilih tenant dulu' }, { status: 400 })

  // Hanya owner yang bisa tambah member
  const me = await prisma.tenantMember.findUnique({
    where: { tenantId_email: { tenantId: pref.tenantId, email: session.email } },
  })
  if (!me || me.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang bisa menambah anggota' }, { status: 403 })
  }

  const { email, role } = await req.json()
  if (!email || !email.trim()) {
    return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 })
  }

  const emailLower = email.trim().toLowerCase()

  // Cek apakah sudah jadi member
  const existing = await prisma.tenantMember.findUnique({
    where: { tenantId_email: { tenantId: pref.tenantId, email: emailLower } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Email ini sudah jadi anggota' }, { status: 409 })
  }

  const member = await prisma.tenantMember.create({
    data: {
      tenantId: pref.tenantId,
      email: emailLower,
      role: role === 'owner' ? 'owner' : 'staff',
    },
  })

  return NextResponse.json({ success: true, member }, { status: 201 })
}

// Hapus member
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) return NextResponse.json({ error: 'Pilih tenant dulu' }, { status: 400 })

  const me = await prisma.tenantMember.findUnique({
    where: { tenantId_email: { tenantId: pref.tenantId, email: session.email } },
  })
  if (!me || me.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang bisa menghapus anggota' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID wajib' }, { status: 400 })

  // Tidak bisa hapus diri sendiri
  if (me.id === id) {
    return NextResponse.json({ error: 'Tidak bisa menghapus diri sendiri' }, { status: 400 })
  }

  await prisma.tenantMember.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

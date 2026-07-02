import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { buildSeatLayout } from '@/lib/seat'
import Dashboard from './Dashboard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')

  const slug = 'kapuas-raya'
  const tenant = await prisma.tenant.findUnique({ where: { slug } })
  if (!tenant) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="text-slate-300">Belum ada data PO.</p>
          <p className="text-sm text-slate-500 mt-2">Jalankan <code className="text-amber-300">npm run seed</code> untuk mengisi data contoh.</p>
        </div>
      </div>
    )
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const besok = new Date(today); besok.setDate(besok.getDate() + 1)

  const trips = await prisma.trip.findMany({
    where: { tenantId: tenant.id, tanggal: today },
    include: {
      rute: { include: { titik: { orderBy: { urutan: 'asc' } } } },
      bus: true,
      _count: { select: { tiket: true } },
    },
    orderBy: { jam: 'asc' },
  })

  const tripView = trips.map((t: any) => ({
    id: t.id, jam: t.jam, dari: t.rute.asal, ke: t.rute.tujuan,
    via: t.rute.titik.slice(1, -1).map((x: any) => x.nama).join(' · ') || '-',
    bus: t.bus.nama, plat: t.bus.plat, sopir: t.sopir || '-',
    terisi: t._count.tiket, total: t.bus.totalKursi, status: t.status.toLowerCase(),
  }))

  const bookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id, createdAt: { gte: today, lt: besok } },
    select: { totalHarga: true },
  })
  const pendapatan = bookings.reduce((s: number, b: any) => s + Number(b.totalHarga), 0)
  const tiketTerjual = tripView.reduce((s: number, t: any) => s + t.terisi, 0)
  const totalKursi = tripView.reduce((s: number, t: any) => s + t.total, 0)
  const okupansi = totalKursi ? Math.round((tiketTerjual / totalKursi) * 100) : 0
  const paketMenunggu = await prisma.paket.count({ where: { tenantId: tenant.id, status: 'SAMPAI' } })

  return (
    <Dashboard
      po={tenant.nama}
      loket={tenant.loket || ''}
      kasir={session.name}
      stat={{ pendapatan, tiketTerjual, totalKursi, okupansi, paketMenunggu }}
      trips={tripView}
    />
  )
}

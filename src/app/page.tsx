import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getPlanLimits, getTenantPlanInfo } from '@/lib/pricing'
import Dashboard from './Dashboard'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')

  const pref = await prisma.userPref.findUnique({ where: { email: session.email } })
  if (!pref) redirect('/pilih-tenant')

  const tenant = await prisma.tenant.findUnique({ where: { id: pref.tenantId } })
  if (!tenant) redirect('/pilih-tenant')

  const planInfo = getTenantPlanInfo(tenant)
  const limits = getPlanLimits(tenant.plan, tenant.planExpires)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

  const trips = await prisma.trip.findMany({
    where: { tenantId: tenant.id, tanggal: { gte: today, lt: tomorrow } },
    include: { rute: true, bus: true, booking: { include: { tiket: true } } },
    orderBy: { jam: 'asc' },
  })

  const pendapatan = trips.reduce((sum, t) => sum + Number(t.booking.reduce((s, b) => s + Number(b.totalHarga), 0)), 0)
  const tiketTerjual = trips.reduce((sum, t) => sum + t.booking.reduce((s, b) => s + b.tiket.length, 0), 0)
  const totalKursi = trips.reduce((sum, t) => sum + t.bus.totalKursi, 0)
  const okupansi = totalKursi ? Math.round((tiketTerjual / totalKursi) * 100) : 0
  const paketMenunggu = await prisma.paket.count({ where: { tenantId: tenant.id, status: 'SAMPAI' } })

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚌</span>
          <div>
            <h1 className="text-white font-semibold text-sm">{tenant.nama}</h1>
            <p className="text-[10px] text-slate-500">{tenant.loket || tenant.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {planInfo.effectivePlan !== planInfo.plan && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-md">⛔ Kedaluwarsa</span>
          )}
          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded-md">
            {planInfo.plan === 'free' ? '🥉' : planInfo.plan === 'basic' ? '🥈' : planInfo.plan === 'pro' ? '🥇' : '💎'} {planInfo.plan}
          </span>
          <a href="/settings" className="text-slate-400 hover:text-white text-xs">⚙️</a>
          <form action="/login" method="get">
            <button type="submit" className="text-xs text-slate-500 hover:text-slate-300">✕</button>
          </form>
        </div>
      </div>

      {/* Plan usage bar */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 py-2 flex gap-4 text-xs text-slate-400 overflow-x-auto">
        <span>🎫 {trips.length}/{limits.maxTripPerDay} trip</span>
        <span>🧾 {tiketTerjual}/{limits.maxBookingPerDay} tiket</span>
        <span>📦 {paketMenunggu}/{limits.maxPaketPerDay} paket</span>
        <span>🚌 {trips.length ? '∞' : `0/${limits.maxBus}`} bus</span>
      </div>

      <Dashboard
        po={tenant.nama}
        loket={tenant.loket || tenant.slug}
        kasir={session.name || session.email}
        stat={{ pendapatan, tiketTerjual, totalKursi, okupansi, paketMenunggu }}
        trips={trips.map(t => ({
          id: t.id,
          jam: t.jam,
          dari: t.rute.asal,
          ke: t.rute.tujuan,
          via: '',
          bus: t.bus.nama,
          plat: t.bus.plat,
          sopir: t.sopir || '-',
          terisi: t.booking.reduce((s, b) => s + b.tiket.length, 0),
          total: t.bus.totalKursi,
          status: t.status.toLowerCase(),
        }))}
      />
      <footer className="text-center py-3 text-[9px] text-slate-700 border-t border-slate-800">
        Z-Trans v1.0 · © 2026 PT Zomet Teknologi Indonesia
      </footer>
    </div>
  )
}

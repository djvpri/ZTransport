'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [tenant, setTenant] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/tenants/me')
      .then(r => r.json())
      .then(d => {
        if (!d.tenant) router.push('/pilih-tenant')
        else setTenant(d.tenant)
      })
  }, [])

  async function save() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenant-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: tenant.nama,
          loket: tenant.loket,
          telepon: tenant.telepon,
          alamat: tenant.alamat,
        }),
      })
      if (!res.ok) throw new Error('Gagal simpan')
      setToast('Tersimpan!')
      setTimeout(() => setToast(''), 3000)
    } catch (e: any) {
      setToast(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!tenant) return <div className="min-h-screen bg-slate-900 p-6 text-slate-400">Loading...</div>

  const plan = tenant.plan || 'free'
  const planLabel = { free: '🥉 Gratis', basic: '🥈 Basic', pro: '🥇 Pro', enterprise: '💎 Enterprise' }[plan] || plan
  const expired = tenant.plan !== 'free' && tenant.planExpires && new Date(tenant.planExpires) < new Date()
  const planExpires = tenant.planExpires ? new Date(tenant.planExpires).toLocaleDateString('id-ID') : '-'

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-4 flex items-center gap-3 border-b border-slate-700">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white text-lg">←</button>
        <h1 className="text-white font-semibold">Pengaturan PO</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {toast && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm rounded-xl px-4 py-3">
            {toast}
          </div>
        )}

        {/* Plan info */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Paket & Langganan</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-lg">{planLabel}</p>
              {expired ? (
                <p className="text-red-400 text-xs mt-1">⛔ Kedaluwarsa {planExpires}</p>
              ) : plan !== 'free' ? (
                <p className="text-slate-400 text-xs mt-1">Berlaku hingga {planExpires}</p>
              ) : (
                <p className="text-slate-500 text-xs mt-1">Tingkatkan untuk fitur lebih</p>
              )}
            </div>
            <a
              href={`https://zone.zomet.my.id/manage?app=ztrans`}
              target="_blank"
              className="text-xs bg-amber-500/20 text-amber-400 px-3 py-2 rounded-lg hover:bg-amber-500/30 transition"
            >
              Kelola paket
            </a>
          </div>
        </div>

        {/* Data PO */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Data PO</p>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nama PO</label>
            <input value={tenant.nama} onChange={e => setTenant({ ...tenant, nama: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nama Loket</label>
            <input value={tenant.loket || ''} onChange={e => setTenant({ ...tenant, loket: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Telepon</label>
            <input value={tenant.telepon || ''} onChange={e => setTenant({ ...tenant, telepon: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Alamat</label>
            <textarea value={tenant.alamat || ''} onChange={e => setTenant({ ...tenant, alamat: e.target.value })} rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-3 transition-all active:scale-[0.98]">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>

        {/* Limits */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Batas Pemakaian ({plan})</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['🚌 Bus', tenant.limits?.maxBus || '?'],
              ['🛣️ Rute', tenant.limits?.maxRute || '?'],
              ['📅 Jadwal', tenant.limits?.maxJadwal || '?'],
              ['🎫 Trip/hari', tenant.limits?.maxTripPerDay || '?'],
              ['🧾 Booking/hari', tenant.limits?.maxBookingPerDay || '?'],
              ['📦 Paket/hari', tenant.limits?.maxPaketPerDay || '?'],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-900 rounded-xl px-3 py-2.5">
                <p className="text-slate-400 text-xs">{label}</p>
                <p className="text-white font-semibold">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

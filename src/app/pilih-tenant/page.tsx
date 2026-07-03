'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PilihTenantPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    fetch('/api/tenants')
      .then(r => r.json())
      .then(d => setTenants(d.tenants || []))
      .catch(() => setError('Gagal memuat daftar PO'))
  }, [])

  async function selectTenant(tenantId: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenants/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      if (!res.ok) throw new Error('Gagal memilih PO')
      router.push('/')
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  async function createTenant() {
    if (!newName.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Gagal membuat PO')
      }
      const d = await res.json()
      await selectTenant(d.tenant.id)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const updateSlug = (name: string) => {
    setNewName(name)
    if (!newSlug) setNewSlug(name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'))
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-slate-900 text-2xl">🚌</div>
          <h1 className="text-xl font-bold text-white">Z-TRANS</h1>
          <p className="text-sm text-slate-400 mt-1">Pilih atau buat PO Bus</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {tenants.length > 0 && (
          <div className="space-y-2 mb-6">
            <p className="text-xs text-slate-500 mb-2">PO yang tersedia:</p>
            {tenants.map((t: any) => (
              <button
                key={t.id}
                onClick={() => selectTenant(t.id)}
                disabled={loading}
                className="w-full text-left bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3.5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <p className="text-white font-medium">{t.nama}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.plan === 'free' ? '🥉 Gratis' : t.plan === 'basic' ? '🥈 Basic' : t.plan === 'pro' ? '🥇 Pro' : '💎 Enterprise'}
                  {t.loket && ` · ${t.loket}`}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-800 pt-6">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full text-sm text-slate-400 hover:text-white transition-colors mb-4"
          >
            {showCreate ? '— Batal' : '+ Buat PO Baru'}
          </button>

          {showCreate && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Nama PO</label>
                <input
                  type="text" value={newName} onChange={e => updateSlug(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="PO Kapuas Raya"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-2">Slug (URL identitas)</label>
                <input
                  type="text" value={newSlug} onChange={e => setNewSlug(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                  placeholder="kapuas-raya"
                />
              </div>
              <button
                onClick={createTenant} disabled={loading || !newName.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold rounded-xl py-3.5 transition-all active:scale-[0.98]"
              >
                {loading ? 'Memproses...' : '🚌 Buat PO & Mulai'}
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-700">
          © 2026 PT Zomet Teknologi Indonesia
        </p>
      </div>
    </div>
  )
}

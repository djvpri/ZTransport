'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PersonFill, PersonFillCheck, PersonFillDash, TrashFill, Plus } from 'react-bootstrap-icons'

type Member = { id: string; email: string; role: string; createdAt: string }

export default function MemberPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [myEmail, setMyEmail] = useState('')

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 3000) }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/member')
      if (!res.ok) { flash('Gagal memuat anggota'); setLoading(false); return }
      const d = await res.json()
      setMembers(d.members || [])
    } catch { flash('Error memuat data') }
    setLoading(false)
  }

  async function loadMe() {
    try {
      const res = await fetch('/api/sessions/me')
      if (res.ok) {
        const d = await res.json()
        setMyEmail(d.email || '')
      }
    } catch {}
  }

  useEffect(() => { load(); loadMe() }, [])

  useEffect(() => {
    const me = members.find(m => m.email === myEmail)
    setIsOwner(me?.role === 'owner')
  }, [members, myEmail])

  async function tambah() {
    if (!email.trim()) return flash('Email wajib diisi')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return flash('Format email tidak valid')

    setAdding(true)
    try {
      const res = await fetch('/api/admin/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const d = await res.json()
      if (res.ok) {
        setEmail('')
        setRole('staff')
        load()
        flash('Anggota ditambahkan!')
      } else {
        flash(d.error || 'Gagal menambah anggota')
      }
    } catch { flash('Error menambah anggota') }
    setAdding(false)
  }

  async function hapus(id: string, memberEmail: string) {
    if (!confirm(`Hapus ${memberEmail}?`)) return
    try {
      const res = await fetch('/api/admin/member', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (res.ok) { load(); flash('Anggota dihapus') }
      else flash(d.error || 'Gagal menghapus')
    } catch { flash('Error menghapus anggota') }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="bg-slate-800 px-4 py-4 flex items-center gap-3 border-b border-slate-700">
        <button onClick={() => router.push('/settings')} className="text-slate-400 hover:text-white text-lg">←</button>
        <h1 className="text-white font-semibold flex items-center gap-2">
          <PersonFill size={16} /> Kelola Anggota
        </h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {toast && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm rounded-xl px-4 py-3">
            {toast}
          </div>
        )}

        {/* Form tambah */}
        {isOwner && (
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Tambah Anggota</p>
            <p className="text-xs text-slate-400">
              Anggota harus sudah punya akun di Z One. Masukkan email yang sama dengan akun Z One mereka.
            </p>
            <input
              type="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tambah()}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
            <div className="flex gap-2">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none"
              >
                <option value="staff">Staff (akses terbatas)</option>
                <option value="owner">Owner (akses penuh)</option>
              </select>
              <button
                onClick={tambah}
                disabled={adding || !email.trim()}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold rounded-xl px-5 py-3 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                <Plus size={14} />
                {adding ? '...' : 'Tambah'}
              </button>
            </div>
          </div>
        )}

        {!isOwner && (
          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 text-xs text-slate-500">
            Hanya owner yang bisa menambah/menghapus anggota.
          </div>
        )}

        {/* List members */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Anggota ({members.length})</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">Belum ada anggota</div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {members.map(m => (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 grid place-items-center text-slate-400">
                    {m.role === 'owner' ? <PersonFillCheck size={14} /> : <PersonFill size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{m.email}</p>
                    <p className="text-xs text-slate-500">
                      {m.role === 'owner' ? '👑 Owner' : '👤 Staff'}
                      {m.email === myEmail && <span className="ml-1 text-amber-400">(kamu)</span>}
                    </p>
                  </div>
                  {isOwner && m.email !== myEmail && m.role !== 'owner' && (
                    <button
                      onClick={() => hapus(m.id, m.email)}
                      className="text-slate-600 hover:text-rose-400 transition p-1"
                      title="Hapus"
                    >
                      <TrashFill size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

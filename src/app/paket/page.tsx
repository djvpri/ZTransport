'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'

type Paket = {
  resi: string; pengirim: string; penerima: string; tujuan: string
  koli: number; tarif: number; status: string; createdAt: string
}

const STATUS_LABEL: Record<string, { t: string; c: string }> = {
  DITERIMA: { t: 'Diterima', c: 'bg-slate-700 text-slate-300' },
  DIKIRIM: { t: 'Dikirim', c: 'bg-sky-500/20 text-sky-300' },
  SAMPAI: { t: 'Menunggu diambil', c: 'bg-amber-400/20 text-amber-300' },
  DIAMBIL: { t: 'Diambil', c: 'bg-teal-500/20 text-teal-300' },
}
const NEXT: Record<string, string> = { DITERIMA: 'DIKIRIM', DIKIRIM: 'SAMPAI', SAMPAI: 'DIAMBIL' }

export default function PaketPage() {
  const router = useRouter()
  const [list, setList] = useState<Paket[]>([])
  const [form, setForm] = useState(false)
  const [f, setF] = useState({ pengirim: '', hpPengirim: '', penerima: '', hpPenerima: '', tujuan: '', isi: '', koli: '1', tarif: '' })
  const [error, setError] = useState('')

  function load() { fetch('/api/paket').then((r) => r.json()).then((d) => setList(d.paket || [])) }
  useEffect(load, [])

  async function simpan() {
    setError('')
    if (!f.pengirim || !f.penerima || !f.tujuan || !f.tarif) return setError('Lengkapi pengirim, penerima, tujuan, dan tarif')
    const res = await fetch('/api/paket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    const d = await res.json()
    if (!res.ok) return setError(d.error)
    setForm(false); setF({ pengirim: '', hpPengirim: '', penerima: '', hpPenerima: '', tujuan: '', isi: '', koli: '1', tarif: '' }); load()
  }

  async function ubahStatus(resi: string, status: string) {
    await fetch('/api/paket', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resi, status }) })
    load()
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400">←</button>
            <h1 className="font-display text-lg tracking-wide">Paket / Kargo</h1>
          </div>
          <button onClick={() => setForm(!form)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900">
            {form ? 'Tutup' : '+ Terima Paket'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 pb-24 space-y-4">
        {form && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([['pengirim', 'Nama pengirim'], ['hpPengirim', 'HP pengirim'], ['penerima', 'Nama penerima'], ['hpPenerima', 'HP penerima'], ['tujuan', 'Kota tujuan'], ['isi', 'Isi paket'], ['koli', 'Jumlah koli'], ['tarif', 'Tarif (Rp)']] as const).map(([k, ph]) => (
              <input key={k} placeholder={ph} value={(f as any)[k]}
                onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500" />
            ))}
            {error && <p className="text-sm text-rose-400 sm:col-span-2">{error}</p>}
            <button onClick={simpan} className="sm:col-span-2 rounded-lg bg-amber-400 py-2.5 font-semibold text-slate-900">Simpan & Buat Resi</button>
          </div>
        )}

        <div className="space-y-2">
          {list.map((p) => {
            const st = STATUS_LABEL[p.status]
            return (
              <div key={p.resi} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300 text-sm">{p.resi}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.c}`}>{st.t}</span>
                  </div>
                  <div className="text-sm mt-1 truncate">{p.pengirim} → {p.penerima}</div>
                  <div className="text-xs text-slate-500">{p.tujuan} · {p.koli} koli · {formatRupiah(p.tarif)}</div>
                </div>
                {NEXT[p.status] && (
                  <button onClick={() => ubahStatus(p.resi, NEXT[p.status])}
                    className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500">
                    → {STATUS_LABEL[NEXT[p.status]].t}
                  </button>
                )}
              </div>
            )
          })}
          {list.length === 0 && <p className="text-slate-500 text-center py-10">Belum ada paket.</p>}
        </div>
      </main>
    </div>
  )
}

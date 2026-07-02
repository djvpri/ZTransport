'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'

type TripDetail = {
  trip: { id: string; jam: string; dari: string; ke: string; bus: string; plat: string; status: string }
  titik: string[]
  tarif: number
  seatRows: string[][]
  terisi: Record<string, string>
}

function JualInner() {
  const router = useRouter()
  const params = useSearchParams()
  const tripId = params.get('trip')

  const [trips, setTrips] = useState<any[]>([])
  const [detail, setDetail] = useState<TripDetail | null>(null)
  const [pilih, setPilih] = useState<string[]>([])
  const [penumpang, setPenumpang] = useState<Record<string, { nama: string; hp: string; turunDi: string }>>({})
  const [metode, setMetode] = useState('TUNAI')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Kalau belum pilih trip → tampilkan daftar trip hari ini
  useEffect(() => {
    if (tripId) {
      fetch(`/api/trip/${tripId}`).then((r) => r.json()).then((d) => {
        if (d.error) setError(d.error); else setDetail(d)
      })
    } else {
      fetch('/api/dashboard').then((r) => r.json()).then((d) => setTrips(d.trips || []))
    }
  }, [tripId])

  function toggleSeat(no: string) {
    if (!no || detail?.terisi[no]) return
    setPilih((prev) => {
      if (prev.includes(no)) {
        const copy = { ...penumpang }; delete copy[no]; setPenumpang(copy)
        return prev.filter((x) => x !== no)
      }
      setPenumpang((p) => ({ ...p, [no]: { nama: '', hp: '', turunDi: detail?.trip.ke || '' } }))
      return [...prev, no]
    })
  }

  async function submit() {
    setError('')
    if (pilih.length === 0) return setError('Pilih minimal 1 kursi')
    for (const k of pilih) if (!penumpang[k]?.nama?.trim()) return setError(`Isi nama penumpang kursi ${k}`)

    setLoading(true)
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: detail!.trip.id,
          channel: 'LOKET',
          metodeBayar: metode,
          namaPemesan: penumpang[pilih[0]].nama,
          hpPemesan: penumpang[pilih[0]].hp,
          penumpang: pilih.map((k) => ({
            kursi: k, nama: penumpang[k].nama, hp: penumpang[k].hp,
            turunDi: penumpang[k].turunDi, harga: detail!.tarif,
          })),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Gagal booking')
      router.push(`/tiket/${d.kode}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Daftar trip ──
  if (!tripId) {
    return (
      <Shell title="Pilih Keberangkatan">
        <div className="space-y-3">
          {trips.map((t) => (
            <button key={t.id} onClick={() => router.push(`/jual?trip=${t.id}`)}
              disabled={t.status === 'penuh' || t.status === 'berangkat'}
              className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex items-center gap-4 hover:bg-slate-800/40 disabled:opacity-40 disabled:cursor-not-allowed">
              <div className="font-display text-2xl text-amber-300 tabular-nums w-14">{t.jam}</div>
              <div className="flex-1">
                <div className="font-semibold">{t.dari} → {t.ke}</div>
                <div className="text-xs text-slate-500">{t.bus} · {t.terisi}/{t.total} kursi</div>
              </div>
              <span className="text-slate-600">›</span>
            </button>
          ))}
          {trips.length === 0 && <p className="text-slate-500 text-center py-10">Belum ada keberangkatan.</p>}
        </div>
      </Shell>
    )
  }

  if (!detail) return <Shell title="Memuat…"><p className="text-slate-500">Memuat data trip…</p></Shell>

  const total = pilih.length * detail.tarif

  return (
    <Shell title={`${detail.trip.dari} → ${detail.trip.ke}`} subtitle={`${detail.trip.jam} WIB · ${detail.trip.bus}`}>
      {/* Seat map */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 mb-4">
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
          <span>Depan / Sopir 🚍</span>
          <div className="flex gap-3">
            <Legend c="bg-slate-700" t="Kosong" /><Legend c="bg-amber-400" t="Dipilih" /><Legend c="bg-rose-500/40" t="Terisi" />
          </div>
        </div>
        <div className="space-y-2 max-w-xs mx-auto">
          {detail.seatRows.map((row, i) => (
            <div key={i} className="flex justify-center gap-2">
              {row.map((no, j) =>
                no === '' ? <div key={j} className="w-6" /> : (
                  <button key={j} onClick={() => toggleSeat(no)} disabled={!!detail.terisi[no]}
                    title={detail.terisi[no] || `Kursi ${no}`}
                    className={`h-9 w-9 rounded-lg text-xs font-semibold tabular-nums transition
                      ${detail.terisi[no] ? 'bg-rose-500/30 text-rose-300 cursor-not-allowed'
                        : pilih.includes(no) ? 'bg-amber-400 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {no}
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data penumpang per kursi */}
      {pilih.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 mb-4 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300">Data Penumpang</h3>
          {pilih.map((k) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold">{k}</span>
                <input placeholder="Nama penumpang" value={penumpang[k]?.nama || ''}
                  onChange={(e) => setPenumpang((p) => ({ ...p, [k]: { ...p[k], nama: e.target.value } }))}
                  className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500" />
              </div>
              <input placeholder="No. HP (opsional)" value={penumpang[k]?.hp || ''}
                onChange={(e) => setPenumpang((p) => ({ ...p, [k]: { ...p[k], hp: e.target.value } }))}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500" />
              <select value={penumpang[k]?.turunDi || ''}
                onChange={(e) => setPenumpang((p) => ({ ...p, [k]: { ...p[k], turunDi: e.target.value } }))}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500">
                {detail.titik.slice(1).map((t) => <option key={t} value={t}>Turun: {t}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}

      {/* Bar pembayaran */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="text-xs text-slate-500">{pilih.length} kursi × {formatRupiah(detail.tarif)}</div>
          <div className="font-display text-2xl text-amber-300 tabular-nums">{formatRupiah(total)}</div>
        </div>
        <select value={metode} onChange={(e) => setMetode(e.target.value)}
          className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm">
          <option value="TUNAI">Tunai</option><option value="TRANSFER">Transfer</option><option value="QRIS">QRIS</option>
        </select>
        <button onClick={submit} disabled={loading || pilih.length === 0}
          className="rounded-xl bg-amber-400 px-6 py-2.5 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-40">
          {loading ? 'Menyimpan…' : 'Bayar & Cetak'}
        </button>
      </div>
    </Shell>
  )
}

function Legend({ c, t }: { c: string; t: string }) {
  return <span className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${c}`} /> {t}</span>
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400">←</button>
          <div>
            <h1 className="font-display text-lg tracking-wide leading-none">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5 pb-24">{children}</main>
    </div>
  )
}

export default function JualPage() {
  return <Suspense fallback={<div className="p-6 text-slate-500">Memuat…</div>}><JualInner /></Suspense>
}

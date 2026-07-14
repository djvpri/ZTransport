'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'
import { GraphUp, Download, LockFill } from 'react-bootstrap-icons'

type Laporan = {
  range: { from: string; to: string }
  summary: { pendapatanTiket: number; pendapatanPaket: number; total: number; jumlahBooking: number; jumlahTiket: number; jumlahPaket: number }
  perHari: { tanggal: string; pendapatan: number; tiket: number; booking: number }[]
  perRute: { nama: string; pendapatan: number; tiket: number }[]
  perBus: { nama: string; pendapatan: number; tiket: number }[]
  perChannel: { channel: string; pendapatan: number; booking: number }[]
  eksporLaporan: boolean
}

type Preset = 'today' | '7days' | '30days' | 'custom'
const CHANNEL_LABEL: Record<string, string> = { LOKET: 'Loket', WA: 'WhatsApp', ONLINE: 'Online', AGEN: 'Agen' }
const ymd = (d: Date) => d.toLocaleDateString('en-CA')
const tglIndo = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function LaporanPage() {
  const router = useRouter()
  const [preset, setPreset] = useState<Preset>('30days')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<Laporan | null>(null)
  const [loading, setLoading] = useState(true)

  const range = useCallback((): { from: string; to: string } => {
    const now = new Date()
    const t = ymd(now)
    const d = new Date(now)
    if (preset === 'today') return { from: t, to: t }
    if (preset === '7days') { d.setDate(d.getDate() - 6); return { from: ymd(d), to: t } }
    if (preset === '30days') { d.setDate(d.getDate() - 29); return { from: ymd(d), to: t } }
    return { from, to }
  }, [preset, from, to])

  useEffect(() => {
    const { from: f, to: tt } = range()
    if (preset === 'custom' && (!f || !tt)) return
    setLoading(true)
    fetch(`/api/laporan?from=${f}&to=${tt}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .finally(() => setLoading(false))
  }, [preset, from, to, range])

  function exportCSV() {
    if (!data) return
    const rows = [['Tanggal', 'Pendapatan Tiket', 'Tiket', 'Booking']]
    data.perHari.forEach((h) => rows.push([h.tanggal, String(h.pendapatan), String(h.tiket), String(h.booking)]))
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_${data.range.from}_${data.range.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CARDS = data ? [
    { label: 'Total Pendapatan', value: formatRupiah(data.summary.total), tone: 'text-amber-300 bg-amber-400/10' },
    { label: 'Pendapatan Tiket', value: formatRupiah(data.summary.pendapatanTiket), tone: 'text-teal-300 bg-teal-400/10' },
    { label: 'Pendapatan Paket', value: formatRupiah(data.summary.pendapatanPaket), tone: 'text-violet-300 bg-violet-400/10' },
    { label: 'Tiket / Booking', value: `${data.summary.jumlahTiket} / ${data.summary.jumlahBooking}`, tone: 'text-sky-300 bg-sky-400/10' },
  ] : []

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-amber-300">←</button>
            <h1 className="font-display text-lg tracking-wide flex items-center gap-2"><GraphUp size={18} className="text-amber-400" /> Laporan</h1>
          </div>
          {data?.eksporLaporan ? (
            <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300">
              <Download size={14} /> CSV
            </button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-500" title="Tersedia di paket Basic ke atas">
              <LockFill size={12} /> Ekspor (Pro)
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 pb-24 space-y-6">
        {/* Filter periode */}
        <div className="flex flex-wrap items-center gap-2">
          {(['today', '7days', '30days', 'custom'] as Preset[]).map((p) => (
            <button key={p} onClick={() => setPreset(p)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${preset === p ? 'bg-amber-400 text-slate-900' : 'border border-slate-700 text-slate-400 hover:text-slate-200'}`}>
              {p === 'today' ? 'Hari Ini' : p === '7days' ? '7 Hari' : p === '30days' ? '30 Hari' : 'Custom'}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs outline-none focus:border-amber-500" />
              <span className="text-xs text-slate-500">s/d</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs outline-none focus:border-amber-500" />
            </div>
          )}
          {data && <span className="ml-auto text-[11px] text-slate-500">{tglIndo(data.range.from)} – {tglIndo(data.range.to)}</span>}
        </div>

        {loading && <p className="py-16 text-center text-sm text-slate-500">Memuat laporan…</p>}

        {!loading && data && (
          <>
            {/* Ringkasan */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {CARDS.map((c) => (
                <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg mb-3 ${c.tone}`}>●</div>
                  <div className="font-display text-lg sm:text-xl tabular-nums tracking-wide">{c.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.label}</div>
                </div>
              ))}
            </section>

            {/* Breakdown per rute & channel */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Per Rute">
                {data.perRute.length === 0 ? <Empty /> : data.perRute.map((r) => (
                  <Row key={r.nama} kiri={r.nama} sub={`${r.tiket} tiket`} kanan={formatRupiah(r.pendapatan)} />
                ))}
              </Panel>
              <Panel title="Per Channel">
                {data.perChannel.length === 0 ? <Empty /> : data.perChannel.map((c) => (
                  <Row key={c.channel} kiri={CHANNEL_LABEL[c.channel] || c.channel} sub={`${c.booking} booking`} kanan={formatRupiah(c.pendapatan)} />
                ))}
              </Panel>
            </div>

            {/* Per bus */}
            <Panel title="Per Bus">
              {data.perBus.length === 0 ? <Empty /> : data.perBus.map((b) => (
                <Row key={b.nama} kiri={b.nama} sub={`${b.tiket} tiket`} kanan={formatRupiah(b.pendapatan)} />
              ))}
            </Panel>

            {/* Per hari */}
            <Panel title="Per Hari">
              {data.perHari.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <th className="py-2 pr-4 font-medium">Tanggal</th>
                        <th className="py-2 pr-4 font-medium text-right">Pendapatan</th>
                        <th className="py-2 pr-4 font-medium text-right">Tiket</th>
                        <th className="py-2 font-medium text-right">Booking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.perHari.map((h) => (
                        <tr key={h.tanggal} className="border-b border-slate-800/60 last:border-0">
                          <td className="py-2 pr-4 text-slate-300">{tglIndo(h.tanggal)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-amber-300">{formatRupiah(h.pendapatan)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums text-slate-400">{h.tiket}</td>
                          <td className="py-2 text-right tabular-nums text-slate-400">{h.booking}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </main>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{title}</h2>
      <div className="space-y-1">{children}</div>
    </section>
  )
}
function Row({ kiri, sub, kanan }: { kiri: string; sub: string; kanan: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-800/50 last:border-0">
      <div className="min-w-0">
        <div className="text-sm text-slate-200 truncate">{kiri}</div>
        <div className="text-[11px] text-slate-500">{sub}</div>
      </div>
      <div className="text-sm font-semibold tabular-nums text-amber-300 shrink-0">{kanan}</div>
    </div>
  )
}
function Empty() { return <p className="text-sm text-slate-600 py-2">Belum ada data di periode ini.</p> }

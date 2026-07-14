'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'
import { GraphUp, Download, LockFill, FileEarmarkPdf } from 'react-bootstrap-icons'

type Laporan = {
  po: string
  range: { from: string; to: string }
  summary: { pendapatanTiket: number; pendapatanPaket: number; total: number; jumlahBooking: number; jumlahTiket: number; jumlahPaket: number }
  perHari: { tanggal: string; pendapatan: number; tiket: number; booking: number }[]
  perRute: { nama: string; pendapatan: number; tiket: number }[]
  perBus: { nama: string; pendapatan: number; tiket: number }[]
  perChannel: { channel: string; pendapatan: number; booking: number }[]
  perMetode: { metode: string; pendapatan: number; jumlah: number }[]
  eksporLaporan: boolean
}

type Preset = 'today' | '7days' | '30days' | 'custom'
const CHANNEL_LABEL: Record<string, string> = { LOKET: 'Loket', WA: 'WhatsApp', ONLINE: 'Online', AGEN: 'Agen' }
const METODE_LABEL: Record<string, string> = { TUNAI: 'Tunai', TRANSFER: 'Transfer', QRIS: 'QRIS' }
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

  function cetakPDF() {
    if (!data) return
    const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const rp = (n: number) => 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID')
    const rows = <T,>(arr: T[], fn: (x: T) => string) => arr.map(fn).join('')
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan ${esc(data.po)}</title><style>
@page{size:A4 portrait;margin:14mm}
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;margin:0}
h1{font-size:18px;margin:0 0 2px}
.sub{color:#555;font-size:11px;margin-bottom:14px}
.sum{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.sum>div{flex:1;min-width:110px;border:1px solid #ddd;border-radius:6px;padding:8px 10px}
.sum .l{font-size:10px;color:#666}
.sum .v{font-size:14px;font-weight:bold}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#444;border-bottom:2px solid #333;padding-bottom:3px;margin:16px 0 6px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #eee}
th{font-size:10px;text-transform:uppercase;color:#666}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
.foot{margin-top:18px;font-size:10px;color:#888}
</style></head><body>
<h1>${esc(data.po)}</h1>
<div class="sub">Laporan Pendapatan &middot; ${tglIndo(data.range.from)} &ndash; ${tglIndo(data.range.to)}</div>
<div class="sum">
<div><div class="l">Total Pendapatan</div><div class="v">${rp(data.summary.total)}</div></div>
<div><div class="l">Pendapatan Tiket</div><div class="v">${rp(data.summary.pendapatanTiket)}</div></div>
<div><div class="l">Pendapatan Paket</div><div class="v">${rp(data.summary.pendapatanPaket)}</div></div>
<div><div class="l">Tiket / Booking</div><div class="v">${data.summary.jumlahTiket} / ${data.summary.jumlahBooking}</div></div>
</div>
<h2>Per Rute</h2>
<table><thead><tr><th>Rute</th><th class="num">Tiket</th><th class="num">Pendapatan</th></tr></thead><tbody>
${rows(data.perRute, (r) => `<tr><td>${esc(r.nama)}</td><td class="num">${r.tiket}</td><td class="num">${rp(r.pendapatan)}</td></tr>`) || '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
<h2>Per Bus</h2>
<table><thead><tr><th>Bus</th><th class="num">Tiket</th><th class="num">Pendapatan</th></tr></thead><tbody>
${rows(data.perBus, (b) => `<tr><td>${esc(b.nama)}</td><td class="num">${b.tiket}</td><td class="num">${rp(b.pendapatan)}</td></tr>`) || '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
<h2>Per Channel</h2>
<table><thead><tr><th>Channel</th><th class="num">Booking</th><th class="num">Pendapatan</th></tr></thead><tbody>
${rows(data.perChannel, (c) => `<tr><td>${esc(CHANNEL_LABEL[c.channel] || c.channel)}</td><td class="num">${c.booking}</td><td class="num">${rp(c.pendapatan)}</td></tr>`) || '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
<h2>Per Metode Bayar</h2>
<table><thead><tr><th>Metode</th><th class="num">Transaksi</th><th class="num">Pendapatan</th></tr></thead><tbody>
${rows(data.perMetode, (m) => `<tr><td>${esc(METODE_LABEL[m.metode] || m.metode)}</td><td class="num">${m.jumlah}</td><td class="num">${rp(m.pendapatan)}</td></tr>`) || '<tr><td colspan="3">—</td></tr>'}
</tbody></table>
<h2>Per Hari</h2>
<table><thead><tr><th>Tanggal</th><th class="num">Pendapatan</th><th class="num">Tiket</th><th class="num">Booking</th></tr></thead><tbody>
${rows(data.perHari, (h) => `<tr><td>${tglIndo(h.tanggal)}</td><td class="num">${rp(h.pendapatan)}</td><td class="num">${h.tiket}</td><td class="num">${h.booking}</td></tr>`) || '<tr><td colspan="4">—</td></tr>'}
</tbody></table>
<div class="foot">Dicetak ${new Date().toLocaleString('id-ID')} &middot; Z-Trans</div>
</body></html>`
    printReport(html)
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
            <div className="flex items-center gap-2">
              <button onClick={cetakPDF} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 hover:text-amber-300 hover:border-slate-600">
                <FileEarmarkPdf size={14} /> PDF
              </button>
              <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300">
                <Download size={14} /> CSV
              </button>
            </div>
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

            {/* Per bus & per metode bayar */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Per Bus">
                {data.perBus.length === 0 ? <Empty /> : data.perBus.map((b) => (
                  <Row key={b.nama} kiri={b.nama} sub={`${b.tiket} tiket`} kanan={formatRupiah(b.pendapatan)} />
                ))}
              </Panel>
              <Panel title="Per Metode Bayar">
                {data.perMetode.length === 0 ? <Empty /> : data.perMetode.map((m) => (
                  <Row key={m.metode} kiri={METODE_LABEL[m.metode] || m.metode} sub={`${m.jumlah} transaksi`} kanan={formatRupiah(m.pendapatan)} />
                ))}
              </Panel>
            </div>

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

// Cetak laporan lewat iframe tersembunyi (dokumen A4 terisolasi). User pilih
// "Simpan sebagai PDF" di dialog print → tanpa dependensi jsPDF.
function printReport(html: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const win = iframe.contentWindow
  const doc = win?.document
  if (!win || !doc) { document.body.removeChild(iframe); window.print(); return }
  let done = false
  const finish = () => { if (done) return; done = true; setTimeout(() => { try { document.body.removeChild(iframe) } catch {} }, 300) }
  doc.open(); doc.write(html); doc.close()
  win.onafterprint = finish
  setTimeout(() => {
    try { win.focus(); win.print() } catch { window.print() }
    setTimeout(finish, 2000)
  }, 250)
}

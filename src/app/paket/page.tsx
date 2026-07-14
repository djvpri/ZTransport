'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'
import { hitungTarifKargo, KARGO_TARIF } from '@/lib/kargo'
import { Printer } from 'react-bootstrap-icons'

type Paket = {
  resi: string; pengirim: string; penerima: string; tujuan: string
  koli: number; tarif: number; status: string; createdAt: string
  isi?: string | null; berat?: number | null; hpPengirim?: string | null; hpPenerima?: string | null
  tripId?: string | null; statusBayar?: string; metodeBayar?: string | null
}
type TripOpt = { id: string; jam: string; tanggal: string; rute: string; bus: string }

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
  const [po, setPo] = useState('')
  const [trips, setTrips] = useState<TripOpt[]>([])
  const [form, setForm] = useState(false)
  const [f, setF] = useState({ pengirim: '', hpPengirim: '', penerima: '', hpPenerima: '', tujuan: '', isi: '', berat: '', koli: '1', tarif: '', tripId: '', statusBayar: 'LUNAS', metodeBayar: 'TUNAI' })
  const [error, setError] = useState('')

  function load() { fetch('/api/paket').then((r) => r.json()).then((d) => { setList(d.paket || []); if (d.po) setPo(d.po) }) }
  useEffect(load, [])
  useEffect(() => { fetch('/api/trip').then((r) => r.json()).then((d) => setTrips(d.trips || [])) }, [])

  const estimasiTarif = hitungTarifKargo({ berat: f.berat, koli: f.koli })
  // Auto-isi tarif dari berat/koli selama field tarif masih kosong (belum di-override manual).
  useEffect(() => {
    setF((s) => (s.tarif ? s : { ...s, tarif: String(hitungTarifKargo({ berat: s.berat, koli: s.koli })) }))
  }, [f.berat, f.koli])

  async function simpan() {
    setError('')
    if (!f.pengirim || !f.penerima || !f.tujuan || !f.tarif) return setError('Lengkapi pengirim, penerima, tujuan, dan tarif')
    const res = await fetch('/api/paket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    const d = await res.json()
    if (!res.ok) return setError(d.error)
    setForm(false); setF({ pengirim: '', hpPengirim: '', penerima: '', hpPenerima: '', tujuan: '', isi: '', berat: '', koli: '1', tarif: '', tripId: '', statusBayar: 'LUNAS', metodeBayar: 'TUNAI' }); load()
  }

  async function ubahStatus(resi: string, status: string) {
    await fetch('/api/paket', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resi, status }) })
    load()
  }

  async function lunasi(resi: string) {
    await fetch('/api/paket', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resi, statusBayar: 'LUNAS', metodeBayar: 'TUNAI' }) })
    load()
  }

  function cetakLabel(p: Paket) {
    const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const tgl = new Date(p.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Label ${esc(p.resi)}</title><style>
@page{size:100mm 150mm;margin:5mm}
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;font-size:12px}
.hd{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:4px}
.hd b{font-size:15px}
.tag{font-size:10px;border:1px solid #000;border-radius:4px;padding:1px 6px}
.resi{text-align:center;margin:10px 0;border:2px solid #000;border-radius:8px;padding:8px}
.resi .l{font-size:10px;letter-spacing:2px;color:#333}
.resi .v{font-size:30px;font-weight:bold;letter-spacing:3px;font-family:'Courier New',monospace}
.row{display:flex;gap:6px;padding:3px 0;border-bottom:1px dashed #bbb}
.row .k{width:66px;color:#555;flex-shrink:0}
.row .v{font-weight:600}
.big{font-size:14px}
.foot{margin-top:10px;text-align:center;font-size:10px;color:#555}
</style></head><body>
<div class="hd"><b>${esc(po || 'Z-Trans')}</b><span class="tag">KARGO</span></div>
<div class="resi"><div class="l">NO. RESI</div><div class="v">${esc(p.resi)}</div></div>
<div class="row"><span class="k">Tujuan</span><span class="v big">${esc(p.tujuan)}</span></div>
<div class="row"><span class="k">Pengirim</span><span class="v">${esc(p.pengirim)}${p.hpPengirim ? ' · ' + esc(p.hpPengirim) : ''}</span></div>
<div class="row"><span class="k">Penerima</span><span class="v">${esc(p.penerima)}${p.hpPenerima ? ' · ' + esc(p.hpPenerima) : ''}</span></div>
<div class="row"><span class="k">Isi</span><span class="v">${esc(p.isi || '-')}</span></div>
<div class="row"><span class="k">Koli/Berat</span><span class="v">${p.koli} koli${p.berat ? ' · ' + p.berat + ' kg' : ''}</span></div>
<div class="row"><span class="k">Tarif</span><span class="v big">${formatRupiah(p.tarif)}</span></div>
<div class="row"><span class="k">Tanggal</span><span class="v">${esc(tgl)}</span></div>
<div class="foot">Simpan &amp; tunjukkan no. resi ini saat pengambilan.</div>
</body></html>`
    printLabel(html)
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
            {([['pengirim', 'Nama pengirim'], ['hpPengirim', 'HP pengirim'], ['penerima', 'Nama penerima'], ['hpPenerima', 'HP penerima'], ['tujuan', 'Kota tujuan'], ['isi', 'Isi paket'], ['berat', 'Berat (kg)'], ['koli', 'Jumlah koli'], ['tarif', 'Tarif (Rp)']] as const).map(([k, ph]) => (
              <input key={k} placeholder={ph} value={(f as any)[k]}
                onChange={(e) => setF((s) => ({ ...s, [k]: e.target.value }))}
                className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500" />
            ))}
            <select value={f.tripId} onChange={(e) => setF((s) => ({ ...s, tripId: e.target.value }))}
              className="sm:col-span-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500 text-slate-300">
              <option value="">Naik trip (opsional) — pilih keberangkatan…</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {t.jam} · {t.rute} · {t.bus}
                </option>
              ))}
            </select>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Pembayaran:</span>
              {(['LUNAS', 'BELUM'] as const).map((sb) => (
                <button key={sb} type="button" onClick={() => setF((s) => ({ ...s, statusBayar: sb }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${f.statusBayar === sb ? (sb === 'LUNAS' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-amber-400/20 text-amber-300 border border-amber-500/40') : 'border border-slate-700 text-slate-400'}`}>
                  {sb === 'LUNAS' ? 'Lunas' : 'Belum bayar'}
                </button>
              ))}
              {f.statusBayar === 'LUNAS' && (
                <select value={f.metodeBayar} onChange={(e) => setF((s) => ({ ...s, metodeBayar: e.target.value }))}
                  className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs outline-none focus:border-amber-500">
                  <option value="TUNAI">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="QRIS">QRIS</option>
                </select>
              )}
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">Estimasi tarif: <span className="font-semibold text-amber-300">{formatRupiah(estimasiTarif)}</span>
                <span className="text-slate-600"> (Rp{KARGO_TARIF.perKg.toLocaleString('id-ID')}/kg + Rp{KARGO_TARIF.perKoli.toLocaleString('id-ID')}/koli, min Rp{KARGO_TARIF.minimum.toLocaleString('id-ID')})</span>
              </span>
              <button type="button" onClick={() => setF((s) => ({ ...s, tarif: String(estimasiTarif) }))}
                className="rounded-lg border border-slate-700 px-3 py-1 font-medium text-amber-300 hover:border-amber-500">Pakai estimasi</button>
            </div>
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
                    {p.statusBayar === 'BELUM' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">Belum bayar</span>}
                  </div>
                  <div className="text-sm mt-1 truncate">{p.pengirim} → {p.penerima}</div>
                  <div className="text-xs text-slate-500">{p.tujuan} · {p.koli} koli · {formatRupiah(p.tarif)}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {p.statusBayar === 'BELUM' && (
                    <button onClick={() => lunasi(p.resi)} className="rounded-lg border border-teal-500/40 text-teal-300 px-3 py-1.5 text-xs hover:bg-teal-500/10">Lunasi</button>
                  )}
                  <button onClick={() => cetakLabel(p)} title="Cetak label"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500">
                    <Printer size={13} />
                  </button>
                  {NEXT[p.status] && (
                    <button onClick={() => ubahStatus(p.resi, NEXT[p.status])}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500">
                      → {STATUS_LABEL[NEXT[p.status]].t}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {list.length === 0 && <p className="text-slate-500 text-center py-10">Belum ada paket.</p>}
        </div>
      </main>
    </div>
  )
}

// Cetak label lewat iframe tersembunyi (100×150mm) → user pilih "Simpan sebagai
// PDF" / cetak. Tanpa dependensi.
function printLabel(html: string) {
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

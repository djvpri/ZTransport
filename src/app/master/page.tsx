'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'
import { GearFill } from 'react-bootstrap-icons'

type Tab = 'bus' | 'rute' | 'jadwal'
const KELAS = ['EKONOMI', 'EXECUTIVE', 'SLEEPER']
const LAYOUT = ['2-2', '2-3', '2-1']
const HARI = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN']

export default function MasterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('bus')
  const [bus, setBus] = useState<any[]>([])
  const [rute, setRute] = useState<any[]>([])
  const [jadwal, setJadwal] = useState<any[]>([])
  const [toast, setToast] = useState('')

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 3000) }

  function loadBus() { fetch('/api/master/bus').then(r => r.json()).then(d => setBus(d.bus || [])) }
  function loadRute() { fetch('/api/master/rute').then(r => r.json()).then(d => setRute(d.rute || [])) }
  function loadJadwal() { fetch('/api/master/jadwal').then(r => r.json()).then(d => setJadwal(d.jadwal || [])) }

  useEffect(() => { loadBus(); loadRute(); loadJadwal() }, [])

  async function generateTrip() {
    const res = await fetch('/api/master/generate-trip', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    const d = await res.json()
    if (res.ok) flash(`Trip hari ini: ${d.dibuat} dibuat, ${d.dilewati} sudah ada.`)
    else flash(d.error || 'Gagal generate trip')
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400">←</button>
            <h1 className="font-display text-lg tracking-wide">Data Master</h1>
          </div>
          <button onClick={generateTrip} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300">
            <GearFill size={14} className="inline mr-1.5" />Buat Trip Hari Ini
          </button>
        </div>
        <div className="mx-auto max-w-4xl px-4 flex gap-1">
          {(['bus', 'rute', 'jadwal'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {t === 'bus' ? 'Armada' : t}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 pb-24">
        {tab === 'bus' && <BusTab bus={bus} reload={loadBus} flash={flash} />}
        {tab === 'rute' && <RuteTab rute={rute} reload={loadRute} flash={flash} />}
        {tab === 'jadwal' && <JadwalTab jadwal={jadwal} rute={rute} bus={bus} reload={loadJadwal} flash={flash} />}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-amber-500 w-full" />
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">{children}</div>
}

// ── Tab Armada ──
function BusTab({ bus, reload, flash }: any) {
  const [f, setF] = useState({ nama: '', plat: '', kelas: 'EKONOMI', layout: '2-2', totalKursi: '32' })
  const [open, setOpen] = useState(false)

  async function simpan() {
    if (!f.nama || !f.plat) return flash('Nama & plat wajib')
    const res = await fetch('/api/master/bus', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    if (res.ok) { setF({ nama: '', plat: '', kelas: 'EKONOMI', layout: '2-2', totalKursi: '32' }); setOpen(false); reload(); flash('Bus ditambahkan') }
    else flash((await res.json()).error)
  }
  async function hapus(id: string) {
    const res = await fetch(`/api/master/bus?id=${id}`, { method: 'DELETE' })
    const d = await res.json(); reload(); flash(d.dinonaktifkan ? 'Bus dinonaktifkan (masih dipakai jadwal)' : 'Bus dihapus')
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(!open)} className="text-sm text-amber-300">{open ? '− Tutup' : '+ Tambah Bus'}</button>
      {open && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field placeholder="Nama (mis. Executive 2-2)" value={f.nama} onChange={e => setF({ ...f, nama: e.target.value })} />
            <Field placeholder="Plat nomor" value={f.plat} onChange={e => setF({ ...f, plat: e.target.value })} />
            <select value={f.kelas} onChange={e => setF({ ...f, kelas: e.target.value })} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {KELAS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            <select value={f.layout} onChange={e => setF({ ...f, layout: e.target.value })} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              {LAYOUT.map(l => <option key={l} value={l}>Layout {l}</option>)}
            </select>
            <Field type="number" placeholder="Total kursi" value={f.totalKursi} onChange={e => setF({ ...f, totalKursi: e.target.value })} />
            <button onClick={simpan} className="rounded-lg bg-amber-400 py-2 font-semibold text-slate-900">Simpan</button>
          </div>
        </Card>
      )}
      <div className="space-y-2">
        {bus.map((b: any) => (
          <Card key={b.id}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {b.nama}
                  {!b.aktif && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">nonaktif</span>}
                </div>
                <div className="text-xs text-slate-500">{b.plat} · {b.kelas} · layout {b.layout} · {b.totalKursi} kursi</div>
              </div>
              <button onClick={() => hapus(b.id)} className="text-xs text-rose-400/70 hover:text-rose-300">Hapus</button>
            </div>
          </Card>
        ))}
        {bus.length === 0 && <p className="text-slate-500 text-center py-8">Belum ada armada.</p>}
      </div>
    </div>
  )
}

// ── Tab Rute ──
function RuteTab({ rute, reload, flash }: any) {
  const [open, setOpen] = useState(false)
  const [titik, setTitik] = useState<string[]>(['', ''])
  const [tarif, setTarif] = useState<{ ke: string; harga: string }[]>([])

  function setTitikAt(i: number, v: string) { setTitik(t => t.map((x, idx) => idx === i ? v : x)) }
  // Tarif otomatis mengikuti titik turun (semua titik selain asal)
  const titikTurun = titik.slice(1).map(t => t.trim()).filter(Boolean)

  async function simpan() {
    const t = titik.map(x => x.trim()).filter(Boolean)
    if (t.length < 2) return flash('Minimal asal & tujuan')
    const tarifValid = titikTurun.map(ke => {
      const found = tarif.find(x => x.ke === ke)
      return { dari: t[0], ke, harga: Number(found?.harga || 0) }
    }).filter(x => x.harga > 0)
    if (tarifValid.length === 0) return flash('Isi minimal 1 tarif')

    const res = await fetch('/api/master/rute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titik: t, tarif: tarifValid }),
    })
    if (res.ok) { setTitik(['', '']); setTarif([]); setOpen(false); reload(); flash('Rute ditambahkan') }
    else flash((await res.json()).error)
  }
  async function hapus(id: string) {
    const res = await fetch(`/api/master/rute?id=${id}`, { method: 'DELETE' })
    const d = await res.json(); reload(); flash(d.dinonaktifkan ? 'Rute dinonaktifkan (masih dipakai)' : 'Rute dihapus')
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(!open)} className="text-sm text-amber-300">{open ? '− Tutup' : '+ Tambah Rute'}</button>
      {open && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">Titik henti (urut dari asal ke tujuan)</p>
          <div className="space-y-2 mb-3">
            {titik.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs text-slate-500 w-14">{i === 0 ? 'Asal' : i === titik.length - 1 ? 'Tujuan' : `Henti ${i}`}</span>
                <Field placeholder="Nama kota/titik" value={t} onChange={e => setTitikAt(i, e.target.value)} />
                {titik.length > 2 && <button onClick={() => setTitik(titik.filter((_, x) => x !== i))} className="text-rose-400 text-xs">×</button>}
              </div>
            ))}
            <button onClick={() => setTitik([...titik.slice(0, -1), '', titik[titik.length - 1]])} className="text-xs text-slate-400">+ Tambah titik henti di tengah</button>
          </div>
          {titikTurun.length > 0 && (
            <>
              <p className="text-xs text-slate-500 mb-2">Tarif per titik turun (dari {titik[0] || 'asal'})</p>
              <div className="space-y-2 mb-3">
                {titikTurun.map(ke => (
                  <div key={ke} className="flex gap-2 items-center">
                    <span className="text-xs text-slate-400 flex-1">→ {ke}</span>
                    <Field type="number" placeholder="Harga" value={tarif.find(x => x.ke === ke)?.harga || ''}
                      onChange={e => setTarif(prev => { const o = prev.filter(x => x.ke !== ke); return [...o, { ke, harga: e.target.value }] })} />
                  </div>
                ))}
              </div>
            </>
          )}
          <button onClick={simpan} className="rounded-lg bg-amber-400 py-2 px-4 font-semibold text-slate-900 text-sm">Simpan Rute</button>
        </Card>
      )}
      <div className="space-y-2">
        {rute.map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {r.asal} → {r.tujuan}
                  {!r.aktif && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">nonaktif</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">via {r.titik.slice(1, -1).join(' · ') || 'langsung'}</div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
                  {r.tarif.map((t: any) => <span key={t.ke}>→{t.ke}: {formatRupiah(t.harga)}</span>)}
                </div>
              </div>
              <button onClick={() => hapus(r.id)} className="text-xs text-rose-400/70 hover:text-rose-300">Hapus</button>
            </div>
          </Card>
        ))}
        {rute.length === 0 && <p className="text-slate-500 text-center py-8">Belum ada rute.</p>}
      </div>
    </div>
  )
}

// ── Tab Jadwal ──
function JadwalTab({ jadwal, rute, bus, reload, flash }: any) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ ruteId: '', busId: '', jam: '', hari: [] as string[] })

  function toggleHari(h: string) { setF(s => ({ ...s, hari: s.hari.includes(h) ? s.hari.filter(x => x !== h) : [...s.hari, h] })) }

  async function simpan() {
    if (!f.ruteId || !f.busId || !f.jam) return flash('Rute, bus, dan jam wajib')
    const res = await fetch('/api/master/jadwal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    if (res.ok) { setF({ ruteId: '', busId: '', jam: '', hari: [] }); setOpen(false); reload(); flash('Jadwal ditambahkan') }
    else flash((await res.json()).error)
  }
  async function hapus(id: string) {
    await fetch(`/api/master/jadwal?id=${id}`, { method: 'DELETE' }); reload(); flash('Jadwal dihapus')
  }

  const ruteAktif = rute.filter((r: any) => r.aktif)
  const busAktif = bus.filter((b: any) => b.aktif)

  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(!open)} className="text-sm text-amber-300">{open ? '− Tutup' : '+ Tambah Jadwal'}</button>
      {open && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <select value={f.ruteId} onChange={e => setF({ ...f, ruteId: e.target.value })} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option value="">Pilih rute…</option>
              {ruteAktif.map((r: any) => <option key={r.id} value={r.id}>{r.asal} → {r.tujuan}</option>)}
            </select>
            <select value={f.busId} onChange={e => setF({ ...f, busId: e.target.value })} className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
              <option value="">Pilih bus…</option>
              {busAktif.map((b: any) => <option key={b.id} value={b.id}>{b.nama} ({b.plat})</option>)}
            </select>
            <Field type="time" value={f.jam} onChange={e => setF({ ...f, jam: e.target.value })} />
          </div>
          <p className="text-xs text-slate-500 mb-2">Hari aktif (kosongkan = setiap hari)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {HARI.map(h => (
              <button key={h} onClick={() => toggleHari(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${f.hari.includes(h) ? 'bg-amber-400 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                {h}
              </button>
            ))}
          </div>
          <button onClick={simpan} className="rounded-lg bg-amber-400 py-2 px-4 font-semibold text-slate-900 text-sm">Simpan Jadwal</button>
        </Card>
      )}
      <div className="space-y-2">
        {jadwal.map((j: any) => (
          <Card key={j.id}>
            <div className="flex items-center gap-4">
              <div className="font-display text-xl text-amber-300 tabular-nums w-14">{j.jam}</div>
              <div className="flex-1">
                <div className="font-semibold">{j.rute}</div>
                <div className="text-xs text-slate-500">{j.bus} · {j.hari.length ? j.hari.join(', ') : 'setiap hari'}</div>
              </div>
              <button onClick={() => hapus(j.id)} className="text-xs text-rose-400/70 hover:text-rose-300">Hapus</button>
            </div>
          </Card>
        ))}
        {jadwal.length === 0 && <p className="text-slate-500 text-center py-8">Belum ada jadwal.</p>}
      </div>
    </div>
  )
}

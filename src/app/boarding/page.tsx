'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CameraFill, CheckCircleFill, SlashCircleFill } from 'react-bootstrap-icons'

type Hasil = { valid: boolean; penumpang?: string; kursi?: string; turunDi?: string; rute?: string; error?: string }

export default function BoardingPage() {
  const router = useRouter()
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const scannerRef = useRef<any>(null)

  async function cek(kode: string) {
    if (!kode) return
    try {
      const res = await fetch('/api/boarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kode: kode.trim() }),
      })
      const d = await res.json()
      setHasil(res.ok ? d : { valid: false, ...d })
    } catch {
      setHasil({ valid: false, error: 'Gagal menghubungi server' })
    }
  }

  // html5-qrcode di-load lewat CDN supaya bundel tetap ringan.
  async function mulaiScan() {
    setScanning(true); setHasil(null)
    // @ts-ignore
    if (!window.Html5Qrcode) {
      await new Promise<void>((res) => {
        const s = document.createElement('script')
        s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
        s.onload = () => res(); document.head.appendChild(s)
      })
    }
    // @ts-ignore
    const scanner = new window.Html5Qrcode('reader')
    scannerRef.current = scanner
    await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 },
      async (text: string) => { await scanner.stop(); setScanning(false); cek(text) },
      () => {})
  }

  useEffect(() => () => { try { scannerRef.current?.stop() } catch {} }, [])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400">←</button>
          <h1 className="font-display text-lg tracking-wide">Boarding — Scan Tiket</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div id="reader" className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[220px] grid place-items-center">
          {!scanning && <span className="text-slate-600 text-sm">Kamera belum aktif</span>}
        </div>

        {!scanning && (
          <button onClick={mulaiScan} className="w-full rounded-xl bg-amber-400 py-3 font-semibold text-slate-900">
            <CameraFill size={15} className="inline mr-1.5" />Mulai Scan QR
          </button>
        )}

        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Atau ketik kode tiket (Txxxxx)"
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm outline-none focus:border-amber-500" />
          <button onClick={() => cek(manual)} className="rounded-lg border border-slate-700 px-4 text-sm text-slate-300">Cek</button>
        </div>

        {hasil && (
          <div className={`rounded-2xl p-5 border ${hasil.valid ? 'border-teal-500/40 bg-teal-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
            <div className="mb-2 flex justify-center">{hasil.valid ? <CheckCircleFill size={30} className="text-emerald-500" /> : <SlashCircleFill size={30} className="text-rose-500" />}</div>
            {hasil.valid ? (
              <>
                <div className="font-display text-2xl text-teal-300">Boleh Naik</div>
                <div className="mt-2 text-sm text-slate-300">{hasil.penumpang} · Kursi {hasil.kursi}</div>
                <div className="text-xs text-slate-500">{hasil.rute} · turun di {hasil.turunDi}</div>
              </>
            ) : (
              <>
                <div className="font-display text-2xl text-rose-300">Ditolak</div>
                <div className="mt-1 text-sm text-slate-300">{hasil.error}</div>
                {hasil.penumpang && <div className="text-xs text-slate-500 mt-1">{hasil.penumpang} · kursi {hasil.kursi}</div>}
              </>
            )}
            <button onClick={() => { setHasil(null); mulaiScan() }} className="mt-4 text-sm text-amber-300">Scan berikutnya →</button>
          </div>
        )}
      </main>
    </div>
  )
}

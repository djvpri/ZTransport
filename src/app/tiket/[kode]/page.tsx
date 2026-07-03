'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { CheckCircleFill, PrinterFill } from 'react-bootstrap-icons'

type Data = {
  kode: string; po: string; loket: string; tanggal: string; jam: string
  rute: string; bus: string; plat: string; total: number; metodeBayar: string
  tiket: { kode: string; kursi: string; nama: string; turunDi: string; harga: number }[]
}

export default function CetakTiket() {
  const { kode } = useParams<{ kode: string }>()
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [qr, setQr] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch(`/api/booking?kode=${kode}`).then((r) => r.json()).then(async (d) => {
      if (d.error) { setErr(d.error); return }
      setData(d)
      // QR per tiket (untuk boarding scan)
      const map: Record<string, string> = {}
      for (const t of d.tiket) {
        map[t.kode] = await QRCode.toDataURL(t.kode, { width: 160, margin: 1 })
      }
      setQr(map)
    })
  }, [kode])

  if (err) return <div className="min-h-screen grid place-items-center text-rose-400">{err}</div>
  if (!data) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat tiket…</div>

  const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
  const tgl = new Date(data.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen">
      {/* Kontrol (tidak ikut tercetak) */}
      <div className="no-print sticky top-0 border-b border-slate-800 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-slate-400 text-sm">← Beranda</button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-teal-300 flex items-center gap-1"><CheckCircleFill size={12} /> Booking {data.kode}</span>
          </div>
          <button onClick={() => window.print()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900">
            <PrinterFill size={14} className="inline mr-1.5" />Cetak
          </button>
        </div>
      </div>

      {/* Area cetak — thermal 58/80mm. Inline style putih-hitam paksa
          (pelajaran dari bug CetakNota: jangan andalkan class tema). */}
      <div className="cetak-area mx-auto my-6" style={{ maxWidth: 320 }}>
        {data.tiket.map((t) => (
          <div key={t.kode} style={{
            background: '#ffffff', color: '#000000', padding: '14px',
            fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.5,
            border: '1px dashed #999', marginBottom: 12, borderRadius: 4,
          }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{data.po}</div>
              <div style={{ fontSize: 11 }}>{data.loket}</div>
            </div>
            <Row k="Booking" v={data.kode} />
            <Row k="Tanggal" v={tgl} />
            <Row k="Jam" v={`${data.jam} WIB`} />
            <Row k="Rute" v={data.rute} />
            <Row k="Bus" v={`${data.bus} (${data.plat})`} />
            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            <Row k="Kursi" v={t.kursi} bold />
            <Row k="Penumpang" v={t.nama} />
            <Row k="Turun di" v={t.turunDi} />
            <Row k="Harga" v={rupiah(t.harga)} />
            <Row k="Bayar" v={data.metodeBayar} />
            {qr[t.kode] && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr[t.kode]} alt="QR" style={{ width: 120, height: 120 }} />
                <div style={{ fontSize: 10, letterSpacing: 1 }}>{t.kode}</div>
                <div style={{ fontSize: 9, marginTop: 2 }}>Tunjukkan QR ini saat naik bus</div>
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: 9, marginTop: 8, borderTop: '1px dashed #000', paddingTop: 6 }}>
              Terima kasih • Simpan tiket sampai tujuan
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span>{k}</span>
      <span style={{ fontWeight: bold ? 700 : 400, textAlign: 'right' }}>{v}</span>
    </div>
  )
}

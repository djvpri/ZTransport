import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

// Manifest penumpang per keberangkatan — untuk dipegang sopir & laporan
// Dishub / asuransi Jasa Raharja. Server component, bisa langsung diprint.
export default async function ManifestPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      rute: true, bus: true, tenant: true,
      tiket: { orderBy: { kursi: 'asc' } },
      paket: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!trip) return <div className="min-h-screen grid place-items-center text-slate-500">Trip tidak ditemukan.</div>

  const tgl = new Date(trip.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen">
      <div className="no-print sticky top-0 border-b border-slate-800 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-slate-400 text-sm">← Beranda</a>
          <PrintButton />
        </div>
      </div>

      <div className="cetak-area mx-auto max-w-3xl p-6" style={{ background: '#ffffff', color: '#000000' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{trip.tenant.nama}</div>
          <div style={{ fontSize: 14 }}>MANIFEST PENUMPANG</div>
        </div>
        <table style={{ width: '100%', fontSize: 13, marginBottom: 12 }}>
          <tbody>
            <tr><td>Rute</td><td style={{ fontWeight: 700 }}>{trip.rute.asal} → {trip.rute.tujuan}</td></tr>
            <tr><td>Tanggal</td><td>{tgl}</td></tr>
            <tr><td>Jam</td><td>{trip.jam} WIB</td></tr>
            <tr><td>Bus / Plat</td><td>{trip.bus.nama} — {trip.bus.plat}</td></tr>
            <tr><td>Sopir</td><td>{trip.sopir || '-'}</td></tr>
          </tbody>
        </table>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: 4 }}>No</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Kursi</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Nama Penumpang</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Turun</th>
              <th style={{ textAlign: 'left', padding: 4 }}>HP</th>
            </tr>
          </thead>
          <tbody>
            {trip.tiket.map((t: any, i: number) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: 4 }}>{i + 1}</td>
                <td style={{ padding: 4, fontWeight: 700 }}>{t.kursi}</td>
                <td style={{ padding: 4 }}>{t.namaPenumpang}</td>
                <td style={{ padding: 4 }}>{t.turunDi || '-'}</td>
                <td style={{ padding: 4 }}>{t.hpPenumpang || '-'}</td>
              </tr>
            ))}
            {trip.tiket.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Belum ada penumpang.</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 16, fontSize: 13 }}>Total penumpang: <b>{trip.tiket.length}</b> / {trip.bus.totalKursi} kursi</div>

        {/* Manifest kargo/paket yang naik di trip ini */}
        <div style={{ marginTop: 20, fontWeight: 700, fontSize: 14, borderBottom: '1px solid #000', paddingBottom: 4 }}>MANIFEST KARGO</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ textAlign: 'left', padding: 4 }}>No</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Resi</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Penerima</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Tujuan</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Koli/Berat</th>
              <th style={{ textAlign: 'left', padding: 4 }}>Bayar</th>
            </tr>
          </thead>
          <tbody>
            {trip.paket.map((p: any, i: number) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #ccc' }}>
                <td style={{ padding: 4 }}>{i + 1}</td>
                <td style={{ padding: 4, fontWeight: 700, fontFamily: 'monospace' }}>{p.resi}</td>
                <td style={{ padding: 4 }}>{p.penerima}{p.hpPenerima ? ` (${p.hpPenerima})` : ''}</td>
                <td style={{ padding: 4 }}>{p.tujuan}</td>
                <td style={{ padding: 4 }}>{p.koli} koli{p.berat ? ` · ${Number(p.berat)} kg` : ''}</td>
                <td style={{ padding: 4 }}>{p.statusBayar === 'LUNAS' ? 'Lunas' : 'BELUM'}</td>
              </tr>
            ))}
            {trip.paket.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#666' }}>Tidak ada kargo di trip ini.</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ marginTop: 12, fontSize: 13 }}>Total kargo: <b>{trip.paket.length}</b> koli/resi</div>
      </div>
    </div>
  )
}

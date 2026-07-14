import { prisma } from './prisma'
import { kodeBooking } from './seat'

// Data demo PO bus — dipakai sistem demo (reset harian oleh cron via
// /api/demo/reset-daily). Timestamp trip/booking/tiket dihitung RELATIF ke
// now() supaya demo selalu terlihat "baru terjadi", kapan pun dibuka.

const BUS_DATA = [
  { nama: 'Executive 2-2', plat: 'KB 7231 AK', kelas: 'EXECUTIVE', layout: '2-2', totalKursi: 32 },
  { nama: 'Ekonomi 2-3', plat: 'KB 7644 AL', kelas: 'EKONOMI', layout: '2-3', totalKursi: 40 },
  { nama: 'Sleeper 2-1', plat: 'KB 7900 AN', kelas: 'SLEEPER', layout: '2-1', totalKursi: 21 },
]

const RUTE_DATA = [
  {
    nama: 'Badau - Pontianak', asal: 'Badau', tujuan: 'Pontianak', tarif: 350000,
    titik: ['Badau', 'Putussibau', 'Sintang', 'Sanggau', 'Pontianak'],
    segmen: [{ dari: 'Badau', ke: 'Sintang', harga: 180000 }, { dari: 'Badau', ke: 'Sanggau', harga: 270000 }],
  },
  { nama: 'Badau - Sintang', asal: 'Badau', tujuan: 'Sintang', tarif: 180000, titik: ['Badau', 'Putussibau', 'Sintang'], segmen: [] },
  { nama: 'Badau - Nanga Pinoh', asal: 'Badau', tujuan: 'Nanga Pinoh', tarif: 220000, titik: ['Badau', 'Sintang', 'Sekadau', 'Nanga Pinoh'], segmen: [] },
]

const JADWAL_DATA = [
  { rute: 'Badau - Pontianak', bus: 'Executive 2-2', jam: '06:00', sopir: 'Pak Yanto', kernet: 'Doni' },
  { rute: 'Badau - Sintang', bus: 'Ekonomi 2-3', jam: '08:30', sopir: 'Pak Rudi', kernet: 'Adi' },
  { rute: 'Badau - Pontianak', bus: 'Executive 2-2', jam: '10:00', sopir: 'Pak Yanto', kernet: 'Doni' },
  { rute: 'Badau - Nanga Pinoh', bus: 'Ekonomi 2-3', jam: '13:00', sopir: 'Pak Deni', kernet: 'Bagas' },
  { rute: 'Badau - Pontianak', bus: 'Sleeper 2-1', jam: '19:00', sopir: 'Pak Amir', kernet: 'Fajar' },
]

const NAMA = ['Budi Santoso', 'Siti Aminah', 'Andi Wijaya', 'Dewi Lestari', 'Rudi Hartono', 'Ratna Sari', 'Eko Prasetyo', 'Maya Putri', 'Hendra Gunawan', 'Citra Dewi', 'Agus Salim', 'Nur Halimah', 'Joko Susilo', 'Rina Marlina', 'Bayu Aji', 'Lestari Ningsih']
const ISI_PAKET = ['Dokumen', 'Sparepart Motor', 'Pakaian', 'Oleh-oleh', 'Elektronik', 'Obat']
const DAY_OFFSETS = [-2, -1, 0, 1, 2] // 2 hari lalu s/d 2 hari ke depan (relatif hari ini)

function acak(min: number, maks: number) { return Math.floor(Math.random() * (maks - min + 1)) + min }
function pilih<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }
function hpAcak() { return '08' + acak(11, 99) + String(acak(1000000, 9999999)) }

// Hapus semua data operasional & katalog milik satu tenant (dipakai saat
// reset demo) — TIDAK menghapus Tenant/TenantMember/UserPref-nya, cuma isinya.
// Urutan anak→induk supaya tidak kena pelanggaran FK.
export async function bersihkanDataToko(tenantId: string): Promise<void> {
  await prisma.tiket.deleteMany({ where: { trip: { tenantId } } })
  await prisma.booking.deleteMany({ where: { tenantId } })
  await prisma.paket.deleteMany({ where: { tenantId } })
  await prisma.trip.deleteMany({ where: { tenantId } })
  await prisma.jadwal.deleteMany({ where: { tenantId } })
  await prisma.tarif.deleteMany({ where: { rute: { tenantId } } })
  await prisma.titikHenti.deleteMany({ where: { rute: { tenantId } } })
  await prisma.rute.deleteMany({ where: { tenantId } })
  await prisma.bus.deleteMany({ where: { tenantId } })
}

export async function seedDataDemo(tenantId: string): Promise<void> {
  // Kode unik terjamin dalam satu run (booking/tiket/paket kode UNIQUE global).
  const used = new Set<string>()
  const uniq = (prefix: string) => { let k: string; do { k = kodeBooking(prefix) } while (used.has(k)); used.add(k); return k }

  // Bus
  const buses: Record<string, { id: string; totalKursi: number }> = {}
  for (const b of BUS_DATA) {
    const row = await prisma.bus.create({
      data: { tenantId, nama: b.nama, plat: b.plat, kelas: b.kelas as never, layout: b.layout, totalKursi: b.totalKursi },
    })
    buses[b.nama] = { id: row.id, totalKursi: b.totalKursi }
  }

  // Rute + titik henti + tarif (penuh + segmen)
  const rutes: Record<string, { id: string; tarif: number; asal: string; tujuan: string }> = {}
  for (const r of RUTE_DATA) {
    const rute = await prisma.rute.create({ data: { tenantId, nama: r.nama, asal: r.asal, tujuan: r.tujuan } })
    await prisma.titikHenti.createMany({ data: r.titik.map((nama, i) => ({ ruteId: rute.id, nama, kota: nama, urutan: i })) })
    await prisma.tarif.create({ data: { ruteId: rute.id, dari: r.asal, ke: r.tujuan, harga: r.tarif } })
    for (const s of r.segmen) await prisma.tarif.create({ data: { ruteId: rute.id, dari: s.dari, ke: s.ke, harga: s.harga } })
    rutes[r.nama] = { id: rute.id, tarif: r.tarif, asal: r.asal, tujuan: r.tujuan }
  }

  // Jadwal (template)
  const jadwals: { id: string; rute: string; bus: string; jam: string; sopir: string; kernet: string }[] = []
  for (const j of JADWAL_DATA) {
    const jadwal = await prisma.jadwal.create({ data: { tenantId, ruteId: rutes[j.rute].id, busId: buses[j.bus].id, jam: j.jam } })
    jadwals.push({ id: jadwal.id, ...j })
  }

  // Trip harian + booking + tiket (relatif ke now)
  const now = new Date()
  for (const off of DAY_OFFSETS) {
    const tanggal = new Date(now); tanggal.setDate(tanggal.getDate() + off); tanggal.setHours(0, 0, 0, 0)
    const isPast = off < 0, isToday = off === 0
    for (const j of jadwals) {
      const bus = buses[j.bus], rute = rutes[j.rute]
      const jamH = Number(j.jam.split(':')[0])
      const sudahBerangkat = isPast || (isToday && jamH <= now.getHours())
      const status = sudahBerangkat ? 'BERANGKAT' : 'TEPAT'
      const trip = await prisma.trip.create({
        data: { tenantId, jadwalId: j.id, ruteId: rute.id, busId: bus.id, tanggal, jam: j.jam, status: status as never, sopir: j.sopir, kernet: j.kernet },
      })

      // Persentase kursi terjual: masa lalu ramai, hari ini sedang, ke depan sepi
      const pct = isPast ? acak(55, 90) : isToday ? acak(35, 75) : acak(5, 35)
      const jual = Math.max(0, Math.min(bus.totalKursi, Math.round((bus.totalKursi * pct) / 100)))
      if (jual === 0) continue
      const seats = Array.from({ length: bus.totalKursi }, (_, i) => String(i + 1)).sort(() => Math.random() - 0.5).slice(0, jual)

      let i = 0
      while (i < seats.length) {
        const grp = seats.slice(i, i + acak(1, 3)); i += grp.length
        const created = new Date(tanggal)
        if (off > 0) created.setTime(now.getTime() - acak(1, 60) * 3600000) // dipesan beberapa jam–hari lalu
        else created.setHours(Math.max(5, jamH - acak(1, 8)), acak(0, 59), 0, 0)
        const belumBayar = off > 0 && Math.random() < 0.3
        await prisma.booking.create({
          data: {
            tenantId, tripId: trip.id, kode: uniq('B'),
            namaPemesan: pilih(NAMA), hpPemesan: hpAcak(),
            channel: pilih(['LOKET', 'LOKET', 'WA', 'ONLINE', 'AGEN']) as never,
            totalHarga: rute.tarif * grp.length,
            statusBayar: (belumBayar ? 'BELUM' : 'LUNAS') as never,
            metodeBayar: belumBayar ? null : pilih(['TUNAI', 'TRANSFER', 'QRIS']),
            createdBy: 'demo@zomet.my.id', createdAt: created,
            tiket: {
              create: grp.map((kursi) => {
                const boarded = sudahBerangkat && Math.random() < 0.85
                return {
                  tripId: trip.id, kursi, namaPenumpang: pilih(NAMA), hpPenumpang: hpAcak(),
                  naikDi: rute.asal, turunDi: rute.tujuan, harga: rute.tarif, kode: uniq('T'),
                  statusBoarding: (boarded ? 'BOARDED' : 'BELUM') as never,
                  boardedAt: boarded ? new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate(), jamH, acak(0, 59)) : null,
                }
              }),
            },
          },
        })
      }
    }
  }

  // Paket (kargo) berbagai status
  const statusPaket = ['DITERIMA', 'DIKIRIM', 'SAMPAI', 'DIAMBIL']
  for (let k = 0; k < 6; k++) {
    await prisma.paket.create({
      data: {
        tenantId, resi: uniq('P'), pengirim: pilih(NAMA), hpPengirim: hpAcak(),
        penerima: pilih(NAMA), hpPenerima: hpAcak(),
        tujuan: pilih(['Pontianak', 'Sintang', 'Nanga Pinoh', 'Sanggau']),
        isi: pilih(ISI_PAKET), berat: acak(1, 20), koli: acak(1, 4), tarif: acak(2, 12) * 10000,
        status: pilih(statusPaket) as never, createdBy: 'demo@zomet.my.id',
        createdAt: new Date(now.getTime() - acak(0, 96) * 3600000),
      },
    })
  }
}

const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Seed data contoh: PO Kapuas Raya + armada, rute, jadwal, dan trip hari ini.
// Aman diulang (upsert by slug/unik). Jalankan: npm run seed
async function seed() {
  console.log('Seeding Z-Trans...')

  const tenant = await p.tenant.upsert({
    where: { slug: 'kapuas-raya' },
    update: {},
    create: { nama: 'PO Kapuas Raya', slug: 'kapuas-raya', loket: 'Loket Badau', telepon: '0812-0000-0000' },
  })

  const busData = [
    { nama: 'Executive 2-2', plat: 'KB 7231 AK', kelas: 'EXECUTIVE', layout: '2-2', totalKursi: 32 },
    { nama: 'Ekonomi 2-3', plat: 'KB 7644 AL', kelas: 'EKONOMI', layout: '2-3', totalKursi: 40 },
    { nama: 'Sleeper 2-1', plat: 'KB 7900 AN', kelas: 'SLEEPER', layout: '2-1', totalKursi: 21 },
  ]
  const buses = {}
  for (const b of busData) {
    const existing = await p.bus.findFirst({ where: { tenantId: tenant.id, plat: b.plat } })
    buses[b.nama] = existing || await p.bus.create({ data: { ...b, tenantId: tenant.id } })
  }

  const ruteData = [
    { nama: 'Badau - Pontianak', asal: 'Badau', tujuan: 'Pontianak', tarif: 350000, titik: ['Badau', 'Putussibau', 'Sintang', 'Sanggau', 'Pontianak'] },
    { nama: 'Badau - Sintang', asal: 'Badau', tujuan: 'Sintang', tarif: 180000, titik: ['Badau', 'Putussibau', 'Sintang'] },
    { nama: 'Badau - Nanga Pinoh', asal: 'Badau', tujuan: 'Nanga Pinoh', tarif: 220000, titik: ['Badau', 'Sintang', 'Sekadau', 'Nanga Pinoh'] },
  ]
  const rutes = {}
  for (const r of ruteData) {
    let rute = await p.rute.findFirst({ where: { tenantId: tenant.id, nama: r.nama } })
    if (!rute) {
      rute = await p.rute.create({ data: { tenantId: tenant.id, nama: r.nama, asal: r.asal, tujuan: r.tujuan } })
      await p.titikHenti.createMany({ data: r.titik.map((nama, i) => ({ ruteId: rute.id, nama, kota: nama, urutan: i })) })
      await p.tarif.create({ data: { ruteId: rute.id, dari: r.asal, ke: r.tujuan, harga: r.tarif } })
    }
    rutes[r.nama] = rute
  }

  // Jadwal + trip hari ini
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const jadwalData = [
    { rute: 'Badau - Pontianak', bus: 'Executive 2-2', jam: '06:00', sopir: 'Pak Yanto' },
    { rute: 'Badau - Sintang', bus: 'Ekonomi 2-3', jam: '08:30', sopir: 'Pak Rudi' },
    { rute: 'Badau - Pontianak', bus: 'Executive 2-2', jam: '10:00', sopir: 'Pak Yanto' },
    { rute: 'Badau - Nanga Pinoh', bus: 'Ekonomi 2-3', jam: '13:00', sopir: 'Pak Deni' },
    { rute: 'Badau - Pontianak', bus: 'Sleeper 2-1', jam: '19:00', sopir: 'Pak Amir' },
  ]
  for (const j of jadwalData) {
    const rute = rutes[j.rute], bus = buses[j.bus]
    let jadwal = await p.jadwal.findFirst({ where: { tenantId: tenant.id, ruteId: rute.id, busId: bus.id, jam: j.jam } })
    if (!jadwal) jadwal = await p.jadwal.create({ data: { tenantId: tenant.id, ruteId: rute.id, busId: bus.id, jam: j.jam } })
    const trip = await p.trip.findFirst({ where: { jadwalId: jadwal.id, tanggal: today } })
    if (!trip) {
      await p.trip.create({ data: { tenantId: tenant.id, jadwalId: jadwal.id, ruteId: rute.id, busId: bus.id, tanggal: today, jam: j.jam, sopir: j.sopir } })
    }
  }

  console.log('Seed selesai ✓ Tenant:', tenant.nama, '| slug:', tenant.slug)
}

seed().catch(e => { console.error(e); process.exit(1) }).finally(() => p.$disconnect())

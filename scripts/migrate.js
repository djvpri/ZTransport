const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

// Migrasi idempoten pakai raw SQL (pola ekosistem Zomet). Hindari
// `prisma db push --accept-data-loss` yang berbahaya. Aman dijalankan
// berulang saat tiap deploy — CREATE ... IF NOT EXISTS.
async function migrate() {
  console.log('Running Z-Trans migrations...')
  const run = async (sql) => {
    try { await p.$executeRawUnsafe(sql) }
    catch (e) { if (!e.message?.includes('already exists')) console.warn('warn:', e.message?.slice(0, 90)) }
  }

  const enums = [
    [`KelasBus`, `'EKONOMI','EXECUTIVE','SLEEPER'`],
    [`HariMinggu`, `'SEN','SEL','RAB','KAM','JUM','SAB','MIN'`],
    [`StatusTrip`, `'TEPAT','BOARDING','BERANGKAT','PENUH','BATAL'`],
    [`Channel`, `'LOKET','WA','ONLINE','AGEN'`],
    [`StatusBayar`, `'BELUM','LUNAS'`],
    [`StatusBoarding`, `'BELUM','BOARDED'`],
    [`StatusPaket`, `'DITERIMA','DIKIRIM','SAMPAI','DIAMBIL'`],
  ]
  for (const [name, vals] of enums) {
    await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='${name}') THEN CREATE TYPE "${name}" AS ENUM (${vals}); END IF; END $x$`)
  }

  await run(`CREATE TABLE IF NOT EXISTS "Tenant" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),nama TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,loket TEXT,telepon TEXT,alamat TEXT,plan TEXT NOT NULL DEFAULT 'free',"planExpires" TIMESTAMP,"isActive" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now())`)

  // Add plan columns to existing Tenant table (idempotent)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='plan') THEN ALTER TABLE "Tenant" ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'; END IF; END $x$`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='planExpires') THEN ALTER TABLE "Tenant" ADD COLUMN "planExpires" TIMESTAMP; END IF; END $x$`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='isActive') THEN ALTER TABLE "Tenant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true; END IF; END $x$`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Tenant' AND column_name='isDemo') THEN ALTER TABLE "Tenant" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false; END IF; END $x$`)

  await run(`CREATE TABLE IF NOT EXISTS "UserPref" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT NOT NULL UNIQUE,"tenantId" TEXT NOT NULL,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "UserPref_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE)`)

  // TenantMember: satu-satunya sumber otorisasi akses tenant (lib/tenant.ts).
  await run(`CREATE TABLE IF NOT EXISTS "TenantMember" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'owner',"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE)`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='TenantMember_tenantId_email_key') THEN ALTER TABLE "TenantMember" ADD CONSTRAINT "TenantMember_tenantId_email_key" UNIQUE ("tenantId", email); END IF; END $x$`)
  await run(`CREATE INDEX IF NOT EXISTS "TenantMember_email_idx" ON "TenantMember"(email)`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='TenantMember' AND column_name='nama') THEN ALTER TABLE "TenantMember" ADD COLUMN nama TEXT; END IF; END $x$`)

  // Backfill: siapa pun yang sudah pernah pilih tenant (UserPref) otomatis
  // jadi owner member tenant itu — supaya user lama tidak kehilangan akses
  // saat sistem membership ini pertama kali diaktifkan.
  await run(`INSERT INTO "TenantMember" (id, "tenantId", email, role) SELECT gen_random_uuid(), "tenantId", email, 'owner' FROM "UserPref" ON CONFLICT ("tenantId", email) DO NOTHING`)

  // Grandfather tambahan: pastikan owner produksi 'kapuas-raya' tidak terkunci
  // keluar saat sistem membership ini pertama kali aktif (jaga-jaga kalau
  // belum pernah pilih tenant lewat /pilih-tenant sama sekali).
  const bootstrapEmail = (process.env.SEED_OWNER_EMAIL || 'sentarummedia@gmail.com').replace(/'/g, "''")
  await run(`INSERT INTO "TenantMember" (id, "tenantId", email, role) SELECT gen_random_uuid(), id, '${bootstrapEmail}', 'owner' FROM "Tenant" WHERE slug='kapuas-raya' ON CONFLICT ("tenantId", email) DO NOTHING`)

  // Tenant DEMO bersama: satu PO demo (slug 'demo') yang direset harian oleh
  // cron. Ditandai isDemo=true (dicari lewat flag ini, bukan hardcode email),
  // plan 'pro' + expiry jauh supaya semua fitur terbuka saat dieksplor.
  // Datanya (bus/rute/trip/booking/tiket/paket) diisi oleh lib/demo-seed.ts
  // lewat cron /api/demo/reset-daily, bukan di sini.
  const demoEmail = (process.env.DEMO_EMAIL || 'demo@zomet.my.id').replace(/'/g, "''")
  await run(`INSERT INTO "Tenant" (id, nama, slug, loket, telepon, plan, "planExpires", "isActive", "isDemo") VALUES (gen_random_uuid(), 'PO Demo Zomet', 'demo', 'Loket Demo', '0800-1234-5678', 'pro', '2099-12-31', true, true) ON CONFLICT (slug) DO UPDATE SET "isDemo"=true, plan='pro', "planExpires"='2099-12-31'`)
  await run(`INSERT INTO "TenantMember" (id, "tenantId", email, role, nama) SELECT gen_random_uuid(), id, '${demoEmail}', 'owner', 'Akun Demo' FROM "Tenant" WHERE slug='demo' ON CONFLICT ("tenantId", email) DO UPDATE SET nama='Akun Demo'`)
  // Akun demo bersama HANYA boleh jadi anggota PO demo (slug 'demo'). Hapus
  // keanggotaan demo@ di PO lain (mis. hasil test) supaya tidak tampil ganda
  // di daftar user ZOne. Hanya menyentuh email demo — user lain tak terpengaruh.
  await run(`DELETE FROM "TenantMember" WHERE email='${demoEmail}' AND "tenantId" NOT IN (SELECT id FROM "Tenant" WHERE slug='demo')`)

  await run(`CREATE TABLE IF NOT EXISTS "Bus" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,nama TEXT NOT NULL,plat TEXT NOT NULL,kelas "KelasBus" NOT NULL DEFAULT 'EKONOMI',layout TEXT NOT NULL DEFAULT '2-2',"totalKursi" INT NOT NULL DEFAULT 32,aktif BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Bus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "Bus_tenantId_idx" ON "Bus"("tenantId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Rute" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,nama TEXT NOT NULL,asal TEXT NOT NULL,tujuan TEXT NOT NULL,aktif BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Rute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "Rute_tenantId_idx" ON "Rute"("tenantId")`)

  await run(`CREATE TABLE IF NOT EXISTS "TitikHenti" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"ruteId" TEXT NOT NULL,nama TEXT NOT NULL,kota TEXT NOT NULL,urutan INT NOT NULL,CONSTRAINT "TitikHenti_ruteId_fkey" FOREIGN KEY ("ruteId") REFERENCES "Rute"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "TitikHenti_ruteId_idx" ON "TitikHenti"("ruteId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Tarif" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"ruteId" TEXT NOT NULL,dari TEXT NOT NULL,ke TEXT NOT NULL,harga DECIMAL(12,2) NOT NULL,CONSTRAINT "Tarif_ruteId_fkey" FOREIGN KEY ("ruteId") REFERENCES "Rute"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "Tarif_ruteId_idx" ON "Tarif"("ruteId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Jadwal" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,"ruteId" TEXT NOT NULL,"busId" TEXT NOT NULL,jam TEXT NOT NULL,hari "HariMinggu"[] NOT NULL DEFAULT '{}',aktif BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Jadwal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,CONSTRAINT "Jadwal_ruteId_fkey" FOREIGN KEY ("ruteId") REFERENCES "Rute"(id) ON DELETE CASCADE,CONSTRAINT "Jadwal_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "Jadwal_tenantId_idx" ON "Jadwal"("tenantId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Trip" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,"jadwalId" TEXT,"ruteId" TEXT NOT NULL,"busId" TEXT NOT NULL,tanggal DATE NOT NULL,jam TEXT NOT NULL,status "StatusTrip" NOT NULL DEFAULT 'TEPAT',sopir TEXT,kernet TEXT,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Trip_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,CONSTRAINT "Trip_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "Jadwal"(id) ON DELETE SET NULL,CONSTRAINT "Trip_ruteId_fkey" FOREIGN KEY ("ruteId") REFERENCES "Rute"(id) ON DELETE CASCADE,CONSTRAINT "Trip_busId_fkey" FOREIGN KEY ("busId") REFERENCES "Bus"(id) ON DELETE CASCADE)`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Trip_jadwalId_tanggal_key') THEN ALTER TABLE "Trip" ADD CONSTRAINT "Trip_jadwalId_tanggal_key" UNIQUE ("jadwalId",tanggal); END IF; END $x$`)
  await run(`CREATE INDEX IF NOT EXISTS "Trip_tenantId_tanggal_idx" ON "Trip"("tenantId",tanggal)`)

  await run(`CREATE TABLE IF NOT EXISTS "Booking" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,"tripId" TEXT NOT NULL,kode TEXT NOT NULL UNIQUE,"namaPemesan" TEXT NOT NULL,"hpPemesan" TEXT,channel "Channel" NOT NULL DEFAULT 'LOKET',"totalHarga" DECIMAL(12,2) NOT NULL,"statusBayar" "StatusBayar" NOT NULL DEFAULT 'LUNAS',"metodeBayar" TEXT,"createdBy" TEXT,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON DELETE CASCADE)`)
  await run(`CREATE INDEX IF NOT EXISTS "Booking_tenantId_idx" ON "Booking"("tenantId")`)
  await run(`CREATE INDEX IF NOT EXISTS "Booking_tripId_idx" ON "Booking"("tripId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Tiket" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"bookingId" TEXT NOT NULL,"tripId" TEXT NOT NULL,kursi TEXT NOT NULL,"namaPenumpang" TEXT NOT NULL,"hpPenumpang" TEXT,"naikDi" TEXT,"turunDi" TEXT,harga DECIMAL(12,2) NOT NULL,kode TEXT NOT NULL UNIQUE,"statusBoarding" "StatusBoarding" NOT NULL DEFAULT 'BELUM',"boardedAt" TIMESTAMP,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Tiket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE CASCADE,CONSTRAINT "Tiket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON DELETE CASCADE)`)
  await run(`DO $x$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Tiket_tripId_kursi_key') THEN ALTER TABLE "Tiket" ADD CONSTRAINT "Tiket_tripId_kursi_key" UNIQUE ("tripId",kursi); END IF; END $x$`)
  await run(`CREATE INDEX IF NOT EXISTS "Tiket_bookingId_idx" ON "Tiket"("bookingId")`)

  await run(`CREATE TABLE IF NOT EXISTS "Paket" (id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),"tenantId" TEXT NOT NULL,"tripId" TEXT,resi TEXT NOT NULL UNIQUE,pengirim TEXT NOT NULL,"hpPengirim" TEXT,penerima TEXT NOT NULL,"hpPenerima" TEXT,tujuan TEXT NOT NULL,isi TEXT,berat DECIMAL(8,2),koli INT NOT NULL DEFAULT 1,tarif DECIMAL(12,2) NOT NULL,status "StatusPaket" NOT NULL DEFAULT 'DITERIMA',"createdBy" TEXT,"createdAt" TIMESTAMP NOT NULL DEFAULT now(),CONSTRAINT "Paket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON DELETE CASCADE,CONSTRAINT "Paket_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON DELETE SET NULL)`)
  await run(`CREATE INDEX IF NOT EXISTS "Paket_tenantId_idx" ON "Paket"("tenantId")`)
  await run(`CREATE INDEX IF NOT EXISTS "Paket_status_idx" ON "Paket"(status)`)

  console.log('Migrations done ✓')
}

migrate()
  .catch(e => { console.error('Migration error:', e.message); process.exit(0) })
  .finally(() => p.$disconnect())

# Z-Trans — Tiket & Manajemen Bus

Aplikasi booking, cetak tiket, dan manajemen armada untuk PO bus. Bagian dari
ekosistem Zomet (SSO lewat Z One).

## Fitur (MVP)
- **Dashboard** papan keberangkatan hari ini + statistik pendapatan/okupansi
- **Jual tiket** loket: pilih trip → seat map interaktif → data penumpang → bayar
- **Cetak tiket thermal** 58/80mm + QR code untuk boarding
- **Boarding scan**: kernet scan QR, cegah tiket dipakai 2x
- **Manifest penumpang** per trip (untuk sopir / Jasa Raharja), bisa diprint
- **Paket / kargo** titipan dengan resi & status (Diterima→Dikirim→Sampai→Diambil)
- **SSO dari Z One** — tidak ada login lokal, pakai akun ekosistem

## Model data
Tenant (PO) → Bus, Rute (+TitikHenti, Tarif per segmen), Jadwal (template) →
Trip (instance harian, kursi dikunci di sini) → Booking → Tiket (unique tripId+kursi).
Paket berdiri sendiri, opsional ditautkan ke Trip.

## Setup
```bash
npm install
cp .env.example .env   # isi DATABASE_URL + CROSS_APP_SECRET (samakan dgn Z One)
npx prisma generate
node scripts/migrate.js   # migrasi idempoten
npm run seed              # data contoh PO Kapuas Raya (opsional)
npm run dev
```

## Deploy Railway
1. Buat service dari repo ini, tambahkan PostgreSQL.
2. Env: `DATABASE_URL`, `CROSS_APP_SECRET` (sama dgn Z One & spoke lain), `NEXT_PUBLIC_ZONE_URL`.
3. `railway.toml` sudah memaksa DOCKERFILE builder. Start script menjalankan migrasi lalu server.
4. Daftarkan di Z One: tambah app `ztrans` (URL: https://ztrans.zomet.my.id) di /manage,
   dan pastikan `SSO_ENABLED_SLUGS` di Z One mencakup `ztrans`.

## Integrasi ekosistem (langkah berikutnya)
- Tambah `{ slug: 'ztrans', name: 'Z-Trans', url: 'https://ztrans.zomet.my.id', ... }` ke `seed-apps.js` Z One.
- Booking via WhatsApp lewat gateway WA yang sudah ada (Hermes/9Router).
- Afiliasi agen tiket → nyambung ke sistem AffiliatePartner Z One.

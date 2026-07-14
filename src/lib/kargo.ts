// Rumus tarif kargo/paket. MVP: berbasis berat (kg) + jumlah koli, dengan
// tarif minimum. Hasil dibulatkan ke 500 terdekat. Dipakai untuk mengisi
// otomatis field tarif di loket (tetap bisa di-override manual).
//
// Catatan: belum per-tujuan/jarak — bisa dikembangkan jadi konfigurasi per
// tenant / per rute nanti.

export const KARGO_TARIF = {
  perKg: 3000,     // Rp per kg
  perKoli: 5000,   // Rp per koli (bungkus)
  minimum: 15000,  // tarif minimum
}

export function hitungTarifKargo(input: { berat?: number | string | null; koli?: number | string | null }): number {
  const berat = Math.max(0, Number(input.berat) || 0)
  const koli = Math.max(1, Number(input.koli) || 1)
  const kotor = KARGO_TARIF.perKg * berat + KARGO_TARIF.perKoli * koli
  const dibulatkan = Math.round(kotor / 500) * 500
  return Math.max(KARGO_TARIF.minimum, dibulatkan)
}

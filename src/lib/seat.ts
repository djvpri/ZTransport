// Helper layout kursi. Berdasarkan layout bus ("2-2" | "2-3" | "2-1")
// dan total kursi, hasilkan susunan baris untuk seat map.
// Nomor kursi: 1..N, dibaca kiri→kanan per baris.

export type SeatLayout = {
  rows: string[][] // tiap baris berisi nomor kursi + "" untuk lorong
  perRow: number
}

export function buildSeatLayout(layout: string, total: number): SeatLayout {
  const config: Record<string, number[]> = {
    '2-2': [2, 2], // kiri 2, lorong, kanan 2
    '2-3': [2, 3],
    '2-1': [2, 1], // sleeper
  }
  const groups = config[layout] || [2, 2]
  const perRow = groups.reduce((a, b) => a + b, 0)
  const rows: string[][] = []
  let n = 1
  while (n <= total) {
    const row: string[] = []
    for (let g = 0; g < groups.length; g++) {
      for (let s = 0; s < groups[g]; s++) {
        row.push(n <= total ? String(n) : '')
        n++
      }
      if (g < groups.length - 1) row.push('') // lorong
    }
    rows.push(row)
  }
  return { rows, perRow }
}

// Kode acak untuk booking & tiket (mudah dieja di loket / lewat WA).
export function kodeBooking(prefix = 'B'): string {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = prefix
  for (let i = 0; i < 5; i++) out += c[Math.floor(Math.random() * c.length)]
  return out
}

export function formatRupiah(n: number | string): string {
  const v = typeof n === 'string' ? Number(n) : n
  return 'Rp ' + v.toLocaleString('id-ID')
}

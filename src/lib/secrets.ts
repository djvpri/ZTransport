// Tidak ada fallback hardcode — samakan CROSS_APP_SECRET dengan Z One & spoke lain.
// (Nilai lama 'uurclTHL375...' dan 'z-ecosystem-admin-2026' pernah bocor di
// repo publik lain di ekosistem ini — JANGAN pernah dipakai lagi sebagai fallback.)
export function getCrossAppSecret(): string {
  const s = process.env.CROSS_APP_SECRET
  if (!s) throw new Error('CROSS_APP_SECRET belum di-set (samakan dengan Z One).')
  return s
}

// Secret untuk endpoint reset demo harian (dipanggil cron via header Bearer,
// bukan session). Fail-closed: kalau belum di-set, semua request ditolak.
export function getDemoResetSecret(): string {
  const s = process.env.DEMO_RESET_SECRET
  if (!s) throw new Error('DEMO_RESET_SECRET belum di-set.')
  return s
}

// Tidak ada fallback hardcode — samakan CROSS_APP_SECRET dengan Z One & spoke lain.
// (Nilai lama 'uurclTHL375...' dan 'z-ecosystem-admin-2026' pernah bocor di
// repo publik lain di ekosistem ini — JANGAN pernah dipakai lagi sebagai fallback.)
export function getCrossAppSecret(): string {
  const s = process.env.CROSS_APP_SECRET
  if (!s) throw new Error('CROSS_APP_SECRET belum di-set (samakan dengan Z One).')
  return s
}

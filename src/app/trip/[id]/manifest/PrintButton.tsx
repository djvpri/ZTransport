'use client'
export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900">
      🖨️ Cetak Manifest
    </button>
  )
}

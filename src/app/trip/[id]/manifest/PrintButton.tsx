'use client'
import { PrinterFill } from 'react-bootstrap-icons'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 flex items-center gap-1.5">
      <PrinterFill size={14} /> Cetak Manifest
    </button>
  )
}

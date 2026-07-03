import type { Metadata } from 'next'
import './globals.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

export const metadata: Metadata = {
  title: 'Z-Trans — Tiket & Manajemen Bus',
  description: 'Booking, cetak tiket, dan manajemen armada untuk PO bus.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{children}</body>
    </html>
  )
}

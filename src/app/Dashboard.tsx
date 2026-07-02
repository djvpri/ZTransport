'use client'
import { useRouter } from 'next/navigation'
import { formatRupiah } from '@/lib/seat'

type Trip = {
  id: string; jam: string; dari: string; ke: string; via: string
  bus: string; plat: string; sopir: string; terisi: number; total: number; status: string
}
type Props = {
  po: string; loket: string; kasir: string
  stat: { pendapatan: number; tiketTerjual: number; totalKursi: number; okupansi: number; paketMenunggu: number }
  trips: Trip[]
}

const STATUS: Record<string, { txt: string; cls: string }> = {
  berangkat: { txt: 'Berangkat', cls: 'bg-slate-700/60 text-slate-300 ring-slate-600' },
  boarding:  { txt: 'Boarding',  cls: 'bg-amber-400/15 text-amber-300 ring-amber-500/40 animate-pulse' },
  penuh:     { txt: 'Penuh',     cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/40' },
  tepat:     { txt: 'Tepat waktu', cls: 'bg-teal-400/15 text-teal-300 ring-teal-500/40' },
  batal:     { txt: 'Batal',     cls: 'bg-slate-800 text-slate-500 ring-slate-700' },
}

function FillBar({ terisi, total }: { terisi: number; total: number }) {
  const pct = total ? Math.round((terisi / total) * 100) : 0
  const color = pct >= 100 ? 'bg-rose-400' : pct >= 75 ? 'bg-amber-400' : 'bg-teal-400'
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-widest text-slate-500">Kursi</span>
        <span className="tabular-nums text-xs font-semibold text-slate-300">{terisi}<span className="text-slate-500">/{total}</span></span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700/70 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard({ po, loket, kasir, stat, trips }: Props) {
  const router = useRouter()
  const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const STATS = [
    { label: 'Pendapatan hari ini', value: formatRupiah(stat.pendapatan), sub: `${stat.tiketTerjual} tiket`, tone: 'text-amber-300 bg-amber-400/10' },
    { label: 'Tiket terjual', value: String(stat.tiketTerjual), sub: `dari ${stat.totalKursi} kursi`, tone: 'text-teal-300 bg-teal-400/10' },
    { label: 'Okupansi rata-rata', value: `${stat.okupansi}%`, sub: `${trips.length} keberangkatan`, tone: 'text-sky-300 bg-sky-400/10' },
    { label: 'Paket menunggu diambil', value: String(stat.paketMenunggu), sub: 'kargo di loket', tone: 'text-violet-300 bg-violet-400/10' },
  ]

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#0B1120]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-400 text-slate-900 text-lg">🚌</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg tracking-wide leading-none">Z-TRANS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-wider truncate">{po}</span>
              </div>
              <p className="text-xs text-slate-500 truncate">{loket} · {kasir}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/master')} title="Data Master"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:text-amber-300 hover:border-slate-600">
              ⚙️
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-amber-300 text-sm font-semibold">
              {kasir?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-sm text-slate-400">Selamat datang, {kasir} 👋</p>
            <h1 className="font-display text-2xl sm:text-3xl tracking-wide capitalize">{tanggal}</h1>
          </div>
          <button onClick={() => router.push('/jual')}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 shadow-lg shadow-amber-500/20 hover:bg-amber-300 active:scale-[0.98] transition">
            + Jual Tiket
          </button>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div className={`grid h-9 w-9 place-items-center rounded-lg mb-3 ${s.tone}`}>●</div>
              <div className="font-display text-xl sm:text-2xl tabular-nums tracking-wide">{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              <div className="text-[11px] text-slate-500 mt-1.5">{s.sub}</div>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400">
              <span className="text-amber-400">◉</span> Papan Keberangkatan
            </h2>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
              <p className="text-slate-400">Belum ada keberangkatan hari ini.</p>
              <p className="text-sm text-slate-600 mt-1">Buat trip dari jadwal, atau jalankan seed data.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden divide-y divide-slate-800">
              {trips.map((t) => {
                const st = STATUS[t.status] || STATUS.tepat
                return (
                  <button key={t.id} onClick={() => router.push(`/jual?trip=${t.id}`)}
                    className="w-full text-left p-4 hover:bg-slate-800/40 transition flex gap-4 items-center">
                    <div className="text-center shrink-0 w-14">
                      <div className="font-display text-2xl tabular-nums leading-none text-amber-300">{t.jam}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">WIB</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span>{t.dari}</span><span className="text-slate-500">→</span><span className="truncate">{t.ke}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">via {t.via}</div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                        <span>🚌 {t.bus}</span><span>👤 {t.sopir}</span>
                      </div>
                    </div>
                    <div className="w-32 shrink-0 hidden sm:block"><FillBar terisi={t.terisi} total={t.total} /></div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ring-1 whitespace-nowrap ${st.cls}`}>{st.txt}</span>
                      <span className="sm:hidden text-[11px] tabular-nums text-slate-400">{t.terisi}/{t.total} kursi</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-800 bg-[#0B1120]/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-4">
          {[
            { label: 'Beranda', icon: '🏠', href: '/' },
            { label: 'Jual', icon: '🎟️', href: '/jual' },
            { label: 'Paket', icon: '📦', href: '/paket' },
            { label: 'Boarding', icon: '📷', href: '/boarding' },
          ].map((n) => (
            <button key={n.href} onClick={() => router.push(n.href)}
              className="flex flex-col items-center gap-1 py-2.5 text-slate-400 active:text-amber-400">
              <span className="text-lg">{n.icon}</span>
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

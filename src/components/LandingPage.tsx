import Link from 'next/link'

const features = [
  {
    icon: 'bi-ticket-perforated-fill',
    iconColor: '#38BDF8', bg: 'rgba(14,165,233,0.1)',
    title: 'Penjualan Tiket',
    desc: 'Jual tiket dari loket dengan tampilan pilihan kursi interaktif. Cetak struk langsung dari browser.',
  },
  {
    icon: 'bi-map-fill',
    iconColor: '#A78BFA', bg: 'rgba(139,92,246,0.1)',
    title: 'Manajemen Trip',
    desc: 'Atur jadwal, rute, dan armada bus dengan mudah. Dashboard harian dengan status trip real-time.',
  },
  {
    icon: 'bi-qr-code-scan',
    iconColor: '#34D399', bg: 'rgba(52,211,153,0.1)',
    title: 'QR Boarding',
    desc: 'Penumpang scan QR code di boarding gate. Cepat, tanpa kertas, tanpa antre panjang.',
  },
  {
    icon: 'bi-people-fill',
    iconColor: '#FBBF24', bg: 'rgba(251,191,36,0.1)',
    title: 'Manifest Penumpang',
    desc: 'Lihat daftar penumpang per trip secara real-time. Export manifest ke PDF kapan saja.',
  },
  {
    icon: 'bi-box-seam-fill',
    iconColor: '#FB923C', bg: 'rgba(249,115,22,0.1)',
    title: 'Kargo & Paket',
    desc: 'Terima, lacak, dan serahkan kiriman paket. Status pengiriman tercatat otomatis.',
  },
  {
    icon: 'bi-bar-chart-fill',
    iconColor: '#FB7185', bg: 'rgba(244,63,94,0.1)',
    title: 'Laporan & Analitik',
    desc: 'Pendapatan harian, tingkat okupansi, dan performa per rute — semua dalam satu layar.',
  },
]

const plans = [
  {
    tier: 'free',
    name: 'Gratis',
    price: 0,
    highlight: false,
    features: [
      '2 bus, 2 rute',
      '4 trip/hari',
      '20 tiket/hari',
      '10 paket/hari',
      'Cetak tiket',
    ],
    disabled: ['Boarding QR', 'Ekspor laporan', 'Multi-loket', 'Booking via WA'],
  },
  {
    tier: 'basic',
    name: 'Basic',
    price: 99000,
    highlight: false,
    features: [
      '5 bus, 5 rute',
      '10 trip/hari',
      '50 tiket/hari',
      '25 paket/hari',
      'Cetak tiket',
      'Boarding QR',
      'Ekspor laporan',
    ],
    disabled: ['Multi-loket', 'Booking via WA'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 299000,
    highlight: true,
    features: [
      '15 bus, 20 rute',
      '40 trip/hari',
      '200 tiket/hari',
      '100 paket/hari',
      'Cetak tiket',
      'Boarding QR',
      'Ekspor laporan',
      'Multi-loket',
      'Booking via WA',
    ],
    disabled: [],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 999000,
    highlight: false,
    features: [
      'Bus & rute tak terbatas',
      'Trip & tiket tak terbatas',
      'Cetak tiket',
      'Boarding QR',
      'Ekspor laporan',
      'Multi-loket',
      'Booking via WA',
      'Afiliasi agen',
    ],
    disabled: [],
  },
]

function formatRp(n: number) {
  if (n === 0) return 'Gratis'
  return 'Rp ' + n.toLocaleString('id-ID')
}

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0F172A', color: '#F1F5F9', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="bi bi-bus-front-fill" style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>Z-Trans</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a href="#fitur" style={{ color: '#94A3B8', fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '8px 12px' }}
              className="nav-link">Fitur</a>
            <a href="#harga" style={{ color: '#94A3B8', fontSize: 14, fontWeight: 500, textDecoration: 'none', padding: '8px 12px' }}
              className="nav-link">Harga</a>
            <Link href="/login" style={{
              background: '#0EA5E9', color: '#fff',
              fontSize: 14, fontWeight: 600,
              padding: '8px 20px', borderRadius: 10,
              textDecoration: 'none', transition: 'background 150ms',
            }}>
              Masuk
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 140, paddingBottom: 96, paddingLeft: 24, paddingRight: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)',
            borderRadius: 999, padding: '6px 16px',
            fontSize: 13, fontWeight: 600, color: '#38BDF8',
            marginBottom: 28,
          }}>
            <i className="bi bi-stars" />
            Platform Digital PO Bus &amp; Travel
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-1.5px', marginBottom: 24,
            color: '#F8FAFC',
          }}>
            Kelola Armada Bus Anda<br />
            <span style={{ color: '#0EA5E9' }}>Dalam Satu Platform</span>
          </h1>

          <p style={{ fontSize: 18, color: '#94A3B8', lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            Penjualan tiket, jadwal trip, manifest penumpang, kargo, dan laporan pendapatan —
            semua digital, semua terhubung.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0EA5E9', color: '#fff',
              fontWeight: 700, fontSize: 15,
              padding: '14px 28px', borderRadius: 12,
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(14,165,233,0.3)',
            }}>
              <i className="bi bi-lightning-charge-fill" />
              Mulai Gratis Sekarang
            </Link>
            <a href="#fitur" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#CBD5E1', fontWeight: 600, fontSize: 15,
              padding: '14px 28px', borderRadius: 12,
              textDecoration: 'none',
            }}>
              Lihat Fitur
              <i className="bi bi-arrow-down" />
            </a>
          </div>

          {/* Mock dashboard strip */}
          <div style={{
            marginTop: 64,
            background: '#1E293B', border: '1px solid #334155',
            borderRadius: 16, padding: '20px 24px',
            display: 'flex', gap: 16, flexWrap: 'wrap',
            maxWidth: 700, margin: '64px auto 0',
          }}>
            {[
              { icon: 'bi-ticket-perforated', label: 'Tiket Terjual', val: '142', color: '#0EA5E9' },
              { icon: 'bi-bus-front', label: 'Trip Hari Ini', val: '8', color: '#A78BFA' },
              { icon: 'bi-cash-coin', label: 'Pendapatan', val: 'Rp 6,8 jt', color: '#34D399' },
              { icon: 'bi-box-seam', label: 'Paket Masuk', val: '23', color: '#FBBF24' },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 120px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: 16 }} />
                  <span style={{ fontSize: 12, color: '#64748B' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: '48px 24px', borderTop: '1px solid #1E293B', borderBottom: '1px solid #1E293B' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {[
            { val: '500+', label: 'Tiket per hari', icon: 'bi-ticket-perforated-fill' },
            { val: '4 Plan', label: 'Pilih sesuai kebutuhan', icon: 'bi-grid-fill' },
            { val: 'QR', label: 'Boarding digital', icon: 'bi-qr-code-scan' },
            { val: 'Multi', label: 'Loket & armada', icon: 'bi-buildings-fill' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 180px', textAlign: 'center',
              padding: '24px 20px',
              background: '#1E293B', border: '1px solid #334155', borderRadius: 16,
            }}>
              <i className={`bi ${s.icon}`} style={{ fontSize: 24, color: '#0EA5E9', marginBottom: 10, display: 'block' }} />
              <div style={{ fontSize: 28, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fitur ── */}
      <section id="fitur" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Fitur Lengkap</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16 }}>
              Semua yang Dibutuhkan PO Bus
            </h2>
            <p style={{ fontSize: 16, color: '#94A3B8', maxWidth: 520, margin: '0 auto' }}>
              Dari penjualan tiket hingga laporan keuangan — satu platform untuk seluruh operasional Anda.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: '#1E293B', border: '1px solid #334155', borderRadius: 16,
                padding: '28px 24px',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, marginBottom: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: f.bg,
                }}>
                  <i className={`bi ${f.icon}`} style={{ fontSize: 22, color: f.iconColor }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="harga" style={{ padding: '96px 24px', background: '#0A1628' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Harga Transparan</p>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16 }}>
              Pilih Plan yang Tepat
            </h2>
            <p style={{ fontSize: 16, color: '#94A3B8' }}>Mulai gratis, upgrade kapan saja. Tanpa kontrak jangka panjang.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
            {plans.map(p => (
              <div key={p.tier} style={{
                background: p.highlight ? 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))' : '#1E293B',
                border: p.highlight ? '2px solid #0EA5E9' : '1px solid #334155',
                borderRadius: 20, padding: '32px 24px',
                position: 'relative',
              }}>
                {p.highlight && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: '#0EA5E9', color: '#fff',
                    fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    padding: '4px 14px', borderRadius: 999,
                  }}>
                    PALING POPULER
                  </div>
                )}

                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#CBD5E1', marginBottom: 12 }}>{p.name}</div>
                  <div>
                    <span style={{ fontSize: p.price === 0 ? 32 : 28, fontWeight: 800, color: '#F1F5F9', letterSpacing: '-0.5px' }}>
                      {formatRp(p.price)}
                    </span>
                    {p.price > 0 && <span style={{ fontSize: 14, color: '#64748B', marginLeft: 4 }}>/bulan</span>}
                  </div>
                </div>

                <Link href="/login" style={{
                  display: 'block', textAlign: 'center',
                  padding: '12px', borderRadius: 12,
                  fontWeight: 700, fontSize: 14, textDecoration: 'none',
                  marginBottom: 28,
                  background: p.highlight ? '#0EA5E9' : 'rgba(255,255,255,0.06)',
                  color: p.highlight ? '#fff' : '#CBD5E1',
                  border: p.highlight ? 'none' : '1px solid #334155',
                }}>
                  {p.price === 0 ? 'Mulai Gratis' : 'Pilih Plan Ini'}
                </Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#CBD5E1' }}>
                      <i className="bi bi-check-lg" style={{ color: '#0EA5E9', fontSize: 14, flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                  {p.disabled.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                      <i className="bi bi-dash" style={{ color: '#475569', fontSize: 14, flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{
          maxWidth: 800, margin: '0 auto', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.1))',
          border: '1px solid rgba(14,165,233,0.2)',
          borderRadius: 24, padding: '64px 32px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16 }}>
              Siap Digitalisasi Armada Anda?
            </h2>
            <p style={{ fontSize: 16, color: '#94A3B8', marginBottom: 36 }}>
              Daftar gratis dalam 2 menit. Tidak perlu kartu kredit.
            </p>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0EA5E9', color: '#fff',
              fontWeight: 700, fontSize: 16,
              padding: '16px 36px', borderRadius: 14,
              textDecoration: 'none',
              boxShadow: '0 0 40px rgba(14,165,233,0.35)',
            }}>
              <i className="bi bi-bus-front-fill" />
              Daftarkan PO Anda Sekarang
              <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1E293B', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="bi bi-bus-front-fill" style={{ color: '#fff', fontSize: 14 }} />
          </div>
          <span style={{ fontWeight: 700, color: '#94A3B8' }}>Z-Trans</span>
        </div>
        <p style={{ fontSize: 12, color: '#475569' }}>
          Bagian dari <a href="https://zone.zomet.my.id" style={{ color: '#64748B' }}>Ekosistem Zomet</a>
          {' '}· © 2026 PT Zomet Teknologi Indonesia
        </p>
      </footer>

      <style>{`
        .nav-link:hover { color: #F1F5F9 !important; }
        @media (max-width: 640px) {
          .nav-link { display: none; }
        }
      `}</style>
    </div>
  )
}

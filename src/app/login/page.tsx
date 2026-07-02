const ZONE_URL = process.env.NEXT_PUBLIC_ZONE_URL || 'https://zone.zomet.my.id'

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-slate-900 text-2xl">🚌</div>
        <h1 className="font-display text-2xl tracking-wide">Z-TRANS</h1>
        <p className="mt-1 text-sm text-slate-400">Tiket &amp; manajemen bus</p>
        <a
          href={`${ZONE_URL}/api/sso/ztrans`}
          className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300 transition"
        >
          Masuk lewat Z One
        </a>
        <p className="mt-4 text-xs text-slate-600">Gunakan akun ekosistem Zomet Anda.</p>
      </div>
    </div>
  )
}

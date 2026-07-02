import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getCrossAppSecret } from './secrets'

export type ZSession = {
  sub: string
  email: string
  name: string
  app?: string
}

const COOKIE = 'ztrans_session'

// Verifikasi token SSO yang diterbitkan Z One (/api/sso/[slug]).
// Token ditandatangani dengan CROSS_APP_SECRET, algoritma HS256, exp 300s.
export function verifySsoToken(token: string): ZSession | null {
  try {
    const payload = jwt.verify(token, getCrossAppSecret(), { algorithms: ['HS256'] }) as any
    if (!payload?.sub || !payload?.email) return null
    if (payload.app && payload.app !== 'ztrans') return null
    return { sub: payload.sub, email: payload.email, name: payload.name || payload.email, app: payload.app }
  } catch {
    return null
  }
}

// Cookie sesi lokal (setelah SSO sukses) — JWT panjang HS256 supaya tidak
// perlu round-trip ke Z One tiap request.
export function issueSessionCookie(s: ZSession): string {
  return jwt.sign({ sub: s.sub, email: s.email, name: s.name }, getCrossAppSecret(), {
    algorithm: 'HS256',
    expiresIn: '7d',
  })
}

export async function getSession(): Promise<ZSession | null> {
  const store = await cookies()
  const raw = store.get(COOKIE)?.value
  if (!raw) return null
  try {
    const payload = jwt.verify(raw, getCrossAppSecret(), { algorithms: ['HS256'] }) as any
    return { sub: payload.sub, email: payload.email, name: payload.name }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = COOKIE

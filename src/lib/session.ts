import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getCrossAppSecret, NEW_SECRET, OLD_SECRET } from './secrets'

export type ZSession = {
  sub: string
  email: string
  name: string
  app?: string
}

const COOKIE = 'ztrans_session'

// Migration 2026-07-02: Dual secret support during transition
function verifyWithFallback(token: string, secret: string): any {
  try {
    return jwt.verify(token, NEW_SECRET, { algorithms: ['HS256'] })
  } catch {
    try {
      return jwt.verify(token, OLD_SECRET, { algorithms: ['HS256'] })
    } catch {
      throw new Error('Token invalid with all secrets')
    }
  }
}

// Verifikasi token SSO yang diterbitkan Z One (/api/sso/[slug]).
// Token ditandatangani dengan CROSS_APP_SECRET, algoritma HS256, exp 300s.
export function verifySsoToken(token: string): ZSession | null {
  try {
    const payload = verifyWithFallback(token, getCrossAppSecret()) as any
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
  return jwt.sign({ sub: s.sub, email: s.email, name: s.name }, NEW_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  })
}

export async function getSession(): Promise<ZSession | null> {
  const store = await cookies()
  const raw = store.get(COOKIE)?.value
  if (!raw) return null
  try {
    const payload = verifyWithFallback(raw, getCrossAppSecret()) as any
    return { sub: payload.sub, email: payload.email, name: payload.name }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = COOKIE

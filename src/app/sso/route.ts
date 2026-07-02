import { NextRequest, NextResponse } from 'next/server'
import { verifySsoToken, issueSessionCookie, SESSION_COOKIE } from '@/lib/session'

// Origin publik yang benar. Di belakang proxy Railway, req.url berisi alamat
// internal (0.0.0.0:8080), jadi kita utamakan header x-forwarded-* / host.
// Bisa juga dipaksa lewat env NEXT_PUBLIC_APP_URL.
function publicOrigin(req: NextRequest): string {
  const forced = process.env.NEXT_PUBLIC_APP_URL
  if (forced) return forced.replace(/\/+$/, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`
  return req.nextUrl.origin // fallback terakhir
}

// Endpoint penerima SSO dari Z One: Z One redirect ke /sso?token=JWT.
// Verifikasi token → set cookie sesi → redirect ke dashboard.
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req)
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(`${origin}/login?err=no_token`)

  const session = verifySsoToken(token)
  if (!session) return NextResponse.redirect(`${origin}/login?err=invalid_token`)

  const res = NextResponse.redirect(`${origin}/`)
  res.cookies.set(SESSION_COOKIE, issueSessionCookie(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

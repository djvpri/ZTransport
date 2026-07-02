import { NextRequest, NextResponse } from 'next/server'
import { verifySsoToken, issueSessionCookie, SESSION_COOKIE } from '@/lib/session'

// Endpoint penerima SSO dari Z One: Z One redirect ke /sso?token=JWT.
// Verifikasi token → set cookie sesi → redirect ke dashboard.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.redirect(new URL('/login?err=no_token', req.url))

  const session = verifySsoToken(token)
  if (!session) return NextResponse.redirect(new URL('/login?err=invalid_token', req.url))

  const res = NextResponse.redirect(new URL('/', req.url))
  res.cookies.set(SESSION_COOKIE, issueSessionCookie(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

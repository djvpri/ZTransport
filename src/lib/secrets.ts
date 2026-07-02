// Migration 2026-07-02: Dual secret support during transition
export const NEW_SECRET = process.env.CROSS_APP_SECRET || 'uurclTHL375CiZeWi2g4T3GczU2YNY9I1wzjlsVTgSk'
export const OLD_SECRET = 'z-ecosystem-admin-2026'
const VALID_SECRETS = [NEW_SECRET, OLD_SECRET]

export function getCrossAppSecret(): string {
  return NEW_SECRET
}

export function isValidCrossAppSecret(token: string): boolean {
  return VALID_SECRETS.includes(token)
}

// ZTransport — Pricing & Plan Limits
// Same tier system as other Z-ecosystem apps

export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise'

export interface PlanLimits {
  maxBus: number
  maxRute: number
  maxJadwal: number
  maxTripPerDay: number
  maxBookingPerDay: number
  maxPaketPerDay: number
  bookingViaWA: boolean
  cetakTiket: boolean
  boardingScan: boolean
  eksporLaporan: boolean
  multiLoket: boolean
  afiliasiAgen: boolean
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxBus: 2,
    maxRute: 2,
    maxJadwal: 4,
    maxTripPerDay: 4,
    maxBookingPerDay: 20,
    maxPaketPerDay: 10,
    bookingViaWA: false,
    cetakTiket: true,
    boardingScan: false,
    eksporLaporan: false,
    multiLoket: false,
    afiliasiAgen: false,
  },
  basic: {
    maxBus: 5,
    maxRute: 5,
    maxJadwal: 10,
    maxTripPerDay: 10,
    maxBookingPerDay: 50,
    maxPaketPerDay: 25,
    bookingViaWA: false,
    cetakTiket: true,
    boardingScan: true,
    eksporLaporan: true,
    multiLoket: false,
    afiliasiAgen: false,
  },
  pro: {
    maxBus: 15,
    maxRute: 20,
    maxJadwal: 40,
    maxTripPerDay: 40,
    maxBookingPerDay: 200,
    maxPaketPerDay: 100,
    bookingViaWA: true,
    cetakTiket: true,
    boardingScan: true,
    eksporLaporan: true,
    multiLoket: true,
    afiliasiAgen: false,
  },
  enterprise: {
    maxBus: 999,
    maxRute: 999,
    maxJadwal: 999,
    maxTripPerDay: 999,
    maxBookingPerDay: 9999,
    maxPaketPerDay: 9999,
    bookingViaWA: true,
    cetakTiket: true,
    boardingScan: true,
    eksporLaporan: true,
    multiLoket: true,
    afiliasiAgen: true,
  },
}

export const PRICING: Record<PlanTier, { label: string; pricePerMonth: number }> = {
  free: { label: 'Gratis', pricePerMonth: 0 },
  basic: { label: 'Basic', pricePerMonth: 99_000 },
  pro: { label: 'Pro', pricePerMonth: 299_000 },
  enterprise: { label: 'Enterprise', pricePerMonth: 999_000 },
}

export const PLAN_DAYS = 30
export const GRACE_DAYS = 7

export function getPlanEndDate(plan: PlanTier, startDate: Date = new Date()): Date {
  if (plan === 'free') return new Date('2099-12-31') // free = no expiry
  const end = new Date(startDate)
  end.setDate(end.getDate() + PLAN_DAYS)
  return end
}

export function getEffectivePlan(plan: string | null | undefined, planExpires: Date | null | undefined): PlanTier {
  const tier = (plan || 'free') as PlanTier
  if (tier === 'free') return 'free'
  if (!planExpires) return 'free'
  
  const now = Date.now()
  const expiresAt = planExpires.getTime()
  if (expiresAt > now) return tier // still active
  // In grace period?
  const graceEnd = expiresAt + GRACE_DAYS * 86400000
  if (graceEnd > now) return 'free' // downgrade to free during grace (data preserved)
  return 'free' // expired, treat as free
}

export function getPlanLimits(plan: string | null | undefined, planExpires: Date | null | undefined): PlanLimits {
  const effective = getEffectivePlan(plan, planExpires)
  return PLAN_LIMITS[effective]
}

export function getTenantPlanInfo(tenant: { plan: string | null; planExpires: Date | null }): {
  plan: string
  effectivePlan: string
  isExpired: boolean
  inGracePeriod: boolean
  expiresAt: string | null
} {
  const effectivePlan = getEffectivePlan(tenant.plan, tenant.planExpires)
  const plan = tenant.plan || 'free'
  const expiresAt = tenant.planExpires?.toISOString() || null
  
  const now = Date.now()
  const expTime = tenant.planExpires?.getTime() || 0
  const isExpired = plan !== 'free' && expTime > 0 && expTime < now
  const inGracePeriod = isExpired && (expTime + 7 * 86400000) > now

  return { plan, effectivePlan, isExpired, inGracePeriod, expiresAt }
}

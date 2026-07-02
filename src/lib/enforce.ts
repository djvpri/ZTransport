import { prisma } from './prisma'
import { getPlanLimits, getEffectivePlan } from './pricing'

export type EnforceResult = { allowed: boolean; reason?: string; limit?: number; current?: number }

export async function enforceBusLimit(tenantId: string): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const count = await prisma.bus.count({ where: { tenantId } })
  if (count >= limits.maxBus) return { allowed: false, reason: `Batas bus (${limits.maxBus}) tercapai`, limit: limits.maxBus, current: count }
  return { allowed: true }
}

export async function enforceRuteLimit(tenantId: string): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const count = await prisma.rute.count({ where: { tenantId } })
  if (count >= limits.maxRute) return { allowed: false, reason: `Batas rute (${limits.maxRute}) tercapai`, limit: limits.maxRute, current: count }
  return { allowed: true }
}

export async function enforceJadwalLimit(tenantId: string): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const count = await prisma.jadwal.count({ where: { tenantId } })
  if (count >= limits.maxJadwal) return { allowed: false, reason: `Batas jadwal (${limits.maxJadwal}) tercapai`, limit: limits.maxJadwal, current: count }
  return { allowed: true }
}

export async function enforceTripLimit(tenantId: string, date: Date): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  const count = await prisma.trip.count({ where: { tenantId, tanggal: { gte: startOfDay, lte: endOfDay } } })
  if (count >= limits.maxTripPerDay) return { allowed: false, reason: `Batas trip/hari (${limits.maxTripPerDay}) tercapai`, limit: limits.maxTripPerDay, current: count }
  return { allowed: true }
}

export async function enforceBookingLimit(tenantId: string, date: Date): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  const count = await prisma.booking.count({ where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } } })
  if (count >= limits.maxBookingPerDay) return { allowed: false, reason: `Batas booking/hari (${limits.maxBookingPerDay}) tercapai`, limit: limits.maxBookingPerDay, current: count }
  return { allowed: true }
}

export async function enforcePaketLimit(tenantId: string, date: Date): Promise<EnforceResult> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!t) return { allowed: false, reason: 'Tenant tidak ditemukan' }
  const limits = getPlanLimits(t.plan, t.planExpires)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  const count = await prisma.paket.count({ where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay } } })
  if (count >= limits.maxPaketPerDay) return { allowed: false, reason: `Batas paket/hari (${limits.maxPaketPerDay}) tercapai`, limit: limits.maxPaketPerDay, current: count }
  return { allowed: true }
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

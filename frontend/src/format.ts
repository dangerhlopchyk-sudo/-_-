import { BillingPeriod, Category, Currency } from './types'
import type { DateParts, EntityId, IsoDate, Urgency, User } from './types'

export const CATEGORY_LABELS: Record<Category, string> = {
  [Category.Ai]: 'ШІ',
  [Category.Streaming]: 'Стрімінг',
  [Category.Cloud]: 'Хмара',
  [Category.Apps]: 'Додатки',
  [Category.Music]: 'Музика',
  [Category.Games]: 'Ігри',
  [Category.Other]: 'Інше',
}

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  [BillingPeriod.Weekly]: 'Щотижня',
  [BillingPeriod.Monthly]: 'Щомісяця',
  [BillingPeriod.Quarterly]: 'Раз на квартал',
  [BillingPeriod.Yearly]: 'Щороку',
}

export const PERIOD_SHORT: Record<BillingPeriod, string> = {
  [BillingPeriod.Weekly]: 'тиждень',
  [BillingPeriod.Monthly]: 'місяць',
  [BillingPeriod.Quarterly]: 'квартал',
  [BillingPeriod.Yearly]: 'рік',
}

export const CURRENCY_LIST: Currency[] = Object.values(Currency)

export function findById<T extends { id: EntityId }>(items: readonly T[], id: EntityId): T | undefined {
  return items.find((item) => item.id === id)
}

export function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function money(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

export function parseIso(iso: IsoDate): DateParts {
  return iso.split('-').map(Number) as DateParts
}

export function formatDate(iso: IsoDate): string {
  const [year, month, day] = parseIso(iso)
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, day),
  )
}

export function urgencyOf(daysLeft: number): Urgency {
  if (daysLeft <= 1) return 'critical'
  if (daysLeft <= 3) return 'warning'
  if (daysLeft <= 7) return 'notice'
  return 'calm'
}

export function daysLabel(daysLeft: number): string {
  if (daysLeft <= 0) return 'Сьогодні'
  if (daysLeft === 1) return 'Завтра'
  const lastTwo = daysLeft % 100
  const last = daysLeft % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `Через ${daysLeft} днів`
  if (last === 1) return `Через ${daysLeft} день`
  if (last >= 2 && last <= 4) return `Через ${daysLeft} дні`
  return `Через ${daysLeft} днів`
}

export function displayName(user: Pick<User, 'name' | 'email'>): string {
  return user.name || user.email
}

export const initialOf = (name: string): string => (name.trim().charAt(0) || '?').toUpperCase()

export const logoUrl = (domain: string, size = 128): string =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`

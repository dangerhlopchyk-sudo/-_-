// Розрахунки періодів, днів до списання та підсумків (дзеркало backend/lib/billing.js).
import { CATEGORIES, CURRENCIES, PERIODS } from './constants'
import type { BillingPeriod, Category, Currency } from './constants'
import type { RatesInfo } from './rates'

const DAY_MS = 86_400_000
const round2 = (n: number): number => Math.round(n * 100) / 100

export type SubscriptionInput = {
  name: string
  cost: number
  currency: Currency
  category: Category
  period: BillingPeriod
  nextBillingDate: string
}

export type SubscriptionDto = SubscriptionInput & {
  id: string
  daysLeft: number
  monthlyUah: number
}

export function parseDay(iso: string): Date {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export const formatDay = (date: Date): string => date.toISOString().slice(0, 10)
export const todayISO = (): string => new Date().toISOString().slice(0, 10)

export function addPeriod(date: Date, period: BillingPeriod): Date {
  const result = new Date(date.getTime())
  if (period === 'weekly') {
    result.setUTCDate(result.getUTCDate() + 7)
    return result
  }
  const months = { monthly: 1, quarterly: 3, yearly: 12 }[period]
  const day = date.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

// Якщо дата списання вже в минулому — зсуваємо її на наступні періоди.
export function shiftToFuture(iso: string, period: BillingPeriod, today: string = todayISO()): string {
  let date = parseDay(iso)
  const limit = parseDay(today)
  let guard = 0
  while (date < limit && guard++ < 5000) date = addPeriod(date, period)
  return formatDay(date)
}

export const daysUntil = (iso: string, today: string = todayISO()): number =>
  Math.round((parseDay(iso).getTime() - parseDay(today).getTime()) / DAY_MS)

export const monthlyEquivalent = (cost: number, period: BillingPeriod): number =>
  ({ weekly: (cost * 52) / 12, monthly: cost, quarterly: cost / 3, yearly: cost / 12 })[period]

export function decorate(sub: SubscriptionInput & { id: string }, rates: Record<string, number>): SubscriptionDto {
  const monthlyUah = monthlyEquivalent(sub.cost, sub.period) * (rates[sub.currency] ?? 1)
  return { ...sub, daysLeft: daysUntil(sub.nextBillingDate), monthlyUah: round2(monthlyUah) }
}

export function buildSummary(items: SubscriptionDto[], ratesInfo: RatesInfo) {
  const monthly = round2(items.reduce((sum, item) => sum + item.monthlyUah, 0))
  const byCategory: Record<string, number> = {}
  for (const item of items) byCategory[item.category] = round2((byCategory[item.category] ?? 0) + item.monthlyUah)
  const nearest = [...items].sort((a, b) => a.daysLeft - b.daysLeft)[0]
  return {
    baseCurrency: 'UAH' as const,
    count: items.length,
    monthly,
    yearly: round2(monthly * 12),
    byCategory: Object.entries(byCategory)
      .map(([category, value]) => ({ category, monthly: value }))
      .sort((a, b) => b.monthly - a.monthly),
    nextCharge: nearest
      ? { name: nearest.name, nextBillingDate: nearest.nextBillingDate, daysLeft: nearest.daysLeft }
      : null,
    rates: ratesInfo.rates,
    ratesDate: ratesInfo.date,
    ratesSource: ratesInfo.source,
  }
}

type ParseResult = { value: SubscriptionInput; error?: undefined } | { error: string; value?: undefined }

// Перевірка вхідних даних форми підписки.
export function parseSubscriptionInput(body: Record<string, unknown> | null | undefined): ParseResult {
  const name = String(body?.name ?? '').trim()
  const cost = Number(body?.cost)
  const { currency, category, period, nextBillingDate } = body ?? {}
  if (!name || name.length > 80) return { error: 'Вкажіть назву підписки (до 80 символів)' }
  if (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000) return { error: 'Вартість має бути числом від 0' }
  if (!(CURRENCIES as readonly unknown[]).includes(currency)) return { error: 'Оберіть валюту зі списку' }
  if (!(CATEGORIES as readonly unknown[]).includes(category)) return { error: 'Оберіть категорію зі списку' }
  if (!(PERIODS as readonly unknown[]).includes(period)) return { error: 'Оберіть періодичність зі списку' }
  const date = typeof nextBillingDate === 'string' ? nextBillingDate : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || formatDay(parseDay(date)) !== date) {
    return { error: 'Вкажіть коректну дату наступного списання' }
  }
  return {
    value: {
      name,
      cost: round2(cost),
      currency: currency as Currency,
      category: category as Category,
      period: period as BillingPeriod,
      nextBillingDate: date,
    },
  }
}

// ---------- Перевірка пароля (правила збігаються з обовʼязковими правилами frontend/src/validators.ts) ----------
// Обовʼязково: 8–64 символи, хоча б одна цифра та один спеціальний символ.
// Решта вимог (великі й малі літери, без пробілів тощо) лише впливають на шкалу надійності у формі.
// Повертає текст першої знайденої проблеми або null, якщо пароль підходить.
export function passwordIssue(password: string): string | null {
  if (password.length < 8) return 'Пароль має містити щонайменше 8 символів'
  if (password.length > 64) return 'Пароль занадто довгий (максимум 64 символи)'
  if (!/\d/.test(password)) return 'Додайте до пароля цифру'
  if (!/[^\p{L}\d\s]/u.test(password)) return 'Додайте до пароля спеціальний символ (наприклад, ! # $ %)'
  return null
}

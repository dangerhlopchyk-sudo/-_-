// Розрахунки періодів, днів до списання та підсумків.
// Ті самі правила реалізовані в cms/src/lib/billing.ts.

export const CURRENCIES = ['UAH', 'USD', 'EUR']
export const CATEGORIES = ['ai', 'streaming', 'music', 'cloud', 'apps', 'games', 'other']
export const PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly']

const DAY_MS = 86_400_000

export function parseDay(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function formatDay(date) {
  return date.toISOString().slice(0, 10)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function addPeriod(date, period) {
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
export function shiftToFuture(iso, period, today = todayISO()) {
  let date = parseDay(iso)
  const limit = parseDay(today)
  let guard = 0
  while (date < limit && guard++ < 5000) date = addPeriod(date, period)
  return formatDay(date)
}

export function daysUntil(iso, today = todayISO()) {
  return Math.round((parseDay(iso) - parseDay(today)) / DAY_MS)
}

export function monthlyEquivalent(cost, period) {
  return { weekly: (cost * 52) / 12, monthly: cost, quarterly: cost / 3, yearly: cost / 12 }[period]
}

const round2 = (n) => Math.round(n * 100) / 100

export function decorate(sub, rates) {
  const monthlyUah = monthlyEquivalent(sub.cost, sub.period) * (rates[sub.currency] ?? 1)
  return { ...sub, daysLeft: daysUntil(sub.nextBillingDate), monthlyUah: round2(monthlyUah) }
}

export function buildSummary(items, ratesInfo) {
  const monthly = round2(items.reduce((sum, i) => sum + i.monthlyUah, 0))
  const byCategory = {}
  for (const item of items) byCategory[item.category] = round2((byCategory[item.category] ?? 0) + item.monthlyUah)
  const nearest = [...items].sort((a, b) => a.daysLeft - b.daysLeft)[0]
  return {
    baseCurrency: 'UAH',
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

// Перевірка вхідних даних форми підписки.
export function parseSubscriptionInput(body) {
  const name = String(body?.name ?? '').trim()
  const cost = Number(body?.cost)
  const { currency, category, period, nextBillingDate } = body ?? {}
  if (!name || name.length > 80) return { error: 'Вкажіть назву підписки (до 80 символів)' }
  if (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000) return { error: 'Вартість має бути числом від 0' }
  if (!CURRENCIES.includes(currency)) return { error: 'Оберіть валюту зі списку' }
  if (!CATEGORIES.includes(category)) return { error: 'Оберіть категорію зі списку' }
  if (!PERIODS.includes(period)) return { error: 'Оберіть періодичність зі списку' }
  const valid = typeof nextBillingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nextBillingDate)
  if (!valid || formatDay(parseDay(nextBillingDate)) !== nextBillingDate) {
    return { error: 'Вкажіть коректну дату наступного списання' }
  }
  return { value: { name, cost: round2(cost), currency, category, period, nextBillingDate } }
}

// Допоміжна функція для демо-даних: сьогодні + N днів.
export function addDaysISO(days, today = todayISO()) {
  const date = parseDay(today)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDay(date)
}

// ---------- Перевірка пароля (правила збігаються з обовʼязковими правилами frontend/src/validators.ts) ----------
// Обовʼязково: 8–64 символи, хоча б одна цифра та один спеціальний символ.
// Решта вимог (великі й малі літери, без пробілів тощо) лише впливають на шкалу надійності у формі.
// Повертає текст першої знайденої проблеми або null, якщо пароль підходить.
export function passwordIssue(password) {
  if (password.length < 8) return 'Пароль має містити щонайменше 8 символів'
  if (password.length > 64) return 'Пароль занадто довгий (максимум 64 символи)'
  if (!/\d/.test(password)) return 'Додайте до пароля цифру'
  if (!/[^\p{L}\d\s]/u.test(password)) return 'Додайте до пароля спеціальний символ (наприклад, ! # $ %)'
  return null
}

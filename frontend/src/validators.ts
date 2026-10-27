// Валідація форм: перевірки пароля, email і підписки.
// Обовʼязкові правила пароля збігаються з серверними (backend/lib/billing.js та cms/src/lib/billing.ts).
// Необовʼязкові правила лише підвищують шкалу надійності.
import { isBillingPeriod, isCategory, isCurrency } from './guards'
import type { FieldErrors, SubscriptionInput } from './types'

// ---------- Типи функцій ----------
export type Validator = (value: string) => string | null

export interface PasswordRule {
  id: string
  label: string
  required: boolean // обовʼязкове правило чи лише для шкали надійності
  test: (password: string, email: string) => boolean
}

export type PasswordStrength = 'weak' | 'medium' | 'strong'

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty123', 'qwertyuiop',
  'iloveyou', 'admin123', 'welcome1', 'letmein1', '11111111', 'abc12345',
])
const SEQUENCES: readonly string[] = ['1234', 'abcd', 'qwer', 'asdf', 'zxcv', 'йцук', 'password', 'passw0rd', '0000']

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', required: true, label: 'Від 8 до 64 символів', test: (p) => p.length >= 8 && p.length <= 64 },
  { id: 'lower', required: false, label: 'Мала літера', test: (p) => /\p{Ll}/u.test(p) },
  { id: 'upper', required: false, label: 'Велика літера', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'digit', required: true, label: 'Цифра', test: (p) => /\d/.test(p) },
  { id: 'special', required: true, label: 'Спеціальний символ (! # $ %)', test: (p) => /[^\p{L}\d\s]/u.test(p) },
  { id: 'spaces', required: false, label: 'Без пробілів', test: (p) => p.length > 0 && !/\s/.test(p) },
  {
    id: 'email',
    required: false, label: 'Не містить частину email',
    test: (p, email) => {
      const local = email.split('@')[0].toLowerCase()
      return p.length > 0 && (local.length < 3 || !p.toLowerCase().includes(local))
    },
  },
  {
    id: 'simple',
    required: false, label: 'Без послідовностей і повторів',
    test: (p) => {
      const lower = p.toLowerCase()
      return p.length > 0 && !COMMON_PASSWORDS.has(lower) && !SEQUENCES.some((s) => lower.includes(s)) && !/(.)\1{3,}/u.test(p)
    },
  },
]

export function evaluatePassword(password: string, email = '') {
  const results = PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(password, email) }))
  const passedCount = results.filter((r) => r.passed).length
  // valid — виконано всі обовʼязкові правила; повна надійність — лише коли виконано всі правила
  const valid = results.every((r) => r.passed || !r.rule.required)
  const strength: PasswordStrength = passedCount === PASSWORD_RULES.length ? 'strong' : valid ? 'medium' : 'weak'
  return { results, passedCount, valid, strength }
}

// Utility Type: тип результату функції без дублювання
export type PasswordReport = ReturnType<typeof evaluatePassword>

// ---------- Email ----------
export const validateEmail: Validator = (value) => {
  const email = value.trim()
  if (!email) return 'Вкажіть email'
  if (email.length > 254) return 'Email занадто довгий'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Некоректний email (приклад: name@example.com)'
  return null
}

// ---------- Форма підписки ----------
export interface SubscriptionValidation {
  value: SubscriptionInput | null
  errors: FieldErrors
}

export function validateSubscription(raw: Record<string, string>): SubscriptionValidation {
  const errors: FieldErrors = {}
  const name = (raw.name ?? '').trim()
  const costText = (raw.cost ?? '').trim().replace(',', '.')
  const cost = Number(costText)
  const date = raw.nextBillingDate ?? ''

  if (!name) errors.name = 'Вкажіть назву сервісу'
  else if (name.length > 80) errors.name = 'Назва має бути не довшою за 80 символів'

  if (costText === '') errors.cost = 'Вкажіть вартість'
  else if (!Number.isFinite(cost)) errors.cost = 'Вартість має бути числом'
  else if (cost < 0) errors.cost = 'Вартість не може бути відʼємною'
  else if (cost > 1_000_000) errors.cost = 'Вартість занадто велика'

  const { currency, category, period } = raw
  if (!isCurrency(currency)) errors.currency = 'Оберіть валюту'
  if (!isCategory(category)) errors.category = 'Оберіть категорію'
  if (!isBillingPeriod(period)) errors.period = 'Оберіть періодичність'

  const parsed = new Date(`${date}T00:00:00`)
  if (!date || Number.isNaN(parsed.getTime())) errors.nextBillingDate = 'Вкажіть коректну дату'
  else if (parsed.getFullYear() > new Date().getFullYear() + 5) errors.nextBillingDate = 'Дата занадто далека (до 5 років)'

  // Після цих перевірок TypeScript звужує типи currency / category / period до enum
  if (Object.keys(errors).length > 0 || !isCurrency(currency) || !isCategory(category) || !isBillingPeriod(period)) {
    return { value: null, errors }
  }
  return {
    value: { name, cost: Math.round(cost * 100) / 100, currency, category, period, nextBillingDate: date },
    errors,
  }
}

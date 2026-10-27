import { BillingPeriod, Category, Currency } from './types'

function isEnumValue<E extends object>(enumObject: E, value: unknown): value is E[keyof E] {
  return typeof value === 'string' && (Object.values(enumObject) as unknown[]).includes(value)
}

export const isCurrency = (value: unknown): value is Currency => isEnumValue(Currency, value)
export const isCategory = (value: unknown): value is Category => isEnumValue(Category, value)
export const isBillingPeriod = (value: unknown): value is BillingPeriod => isEnumValue(BillingPeriod, value)

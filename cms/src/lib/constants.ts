export const CURRENCIES = ['UAH', 'USD', 'EUR'] as const
export const CATEGORIES = ['ai', 'streaming', 'music', 'cloud', 'apps', 'games', 'other'] as const
export const PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly'] as const

export type Currency = (typeof CURRENCIES)[number]
export type Category = (typeof CATEGORIES)[number]
export type BillingPeriod = (typeof PERIODS)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  ai: 'ШІ',
  streaming: 'Стрімінг',
  cloud: 'Хмара',
  apps: 'Додатки',
  music: 'Музика',
  games: 'Ігри',
  other: 'Інше',
}

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  weekly: 'Щотижня',
  monthly: 'Щомісяця',
  quarterly: 'Раз на квартал',
  yearly: 'Щороку',
}

// Варіанти для полів Select в адмін-панелі (строгі списки замість довільного тексту)
export const categoryOptions = CATEGORIES.map((value) => ({ label: CATEGORY_LABELS[value], value }))
export const periodOptions = PERIODS.map((value) => ({ label: PERIOD_LABELS[value], value }))
export const currencyOptions = CURRENCIES.map((value) => ({ label: value, value }))

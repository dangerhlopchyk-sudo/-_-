import { isBillingPeriod, isCategory, isCurrency } from './guards'
import { BillingPeriod, Category, Currency } from './types'
import type {
  ApiGetFunction,
  AuthResponse,
  CategoryTotal,
  EntityId,
  RatesMap,
  RawSubscription,
  RawSummary,
  Subscription,
  SubscriptionInput,
  Summary,
  User,
} from './types'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const TOKEN_KEY = 'subscriptions_token'

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
    }
  },
}

export class ApiError extends Error {
  status: number
  endpointUrl: string

  constructor(message: string, status: number, endpointUrl: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.endpointUrl = endpointUrl
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

async function request<T>(method: HttpMethod, endpoint: string, body?: unknown): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (token) headers.Authorization = `JWT ${token}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Сервер недоступний. Перевірте запуск бекенду та адресу VITE_API_URL.', 0, url)
  }

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `HTTP status: ${response.status}`
    throw new ApiError(message, response.status, url)
  }
  return payload as T
}

export const getJson: ApiGetFunction = <T>(endpoint: string): Promise<T> => request<T>('GET', endpoint)

function toSubscription(raw: RawSubscription): Subscription {
  return {
    ...raw,
    currency: isCurrency(raw.currency) ? raw.currency : Currency.UAH,
    category: isCategory(raw.category) ? raw.category : Category.Other,
    period: isBillingPeriod(raw.period) ? raw.period : BillingPeriod.Monthly,
  }
}

function toSummary(raw: RawSummary): Summary {
  const byCategory: CategoryTotal[] = raw.byCategory.map(({ category, monthly }) => ({
    category: isCategory(category) ? category : Category.Other,
    monthly,
  }))
  const rates: RatesMap = {
    [Currency.UAH]: raw.rates.UAH ?? 1,
    [Currency.USD]: raw.rates.USD ?? 0,
    [Currency.EUR]: raw.rates.EUR ?? 0,
  }
  return {
    count: raw.count,
    monthly: raw.monthly,
    yearly: raw.yearly,
    byCategory,
    nextCharge: raw.nextCharge,
    rates,
    ratesDate: raw.ratesDate,
    ratesSource: raw.ratesSource === 'nbu' ? 'nbu' : 'fallback',
  }
}

export const login = (email: string, password: string): Promise<AuthResponse> =>
  request<AuthResponse>('POST', '/auth/login', { email, password })

export const register = (name: string, email: string, password: string): Promise<AuthResponse> =>
  request<AuthResponse>('POST', '/auth/register', { name, email, password })

export const getMe = async (): Promise<User> => (await getJson<{ user: User }>('/auth/me')).user

export async function getSubscriptions(): Promise<Subscription[]> {
  const { items } = await getJson<{ items: RawSubscription[] }>('/my/subscriptions')
  return items.map(toSubscription)
}

export async function getSummary(): Promise<Summary> {
  return toSummary(await getJson<RawSummary>('/my/summary'))
}

export async function createSubscription(input: SubscriptionInput): Promise<Subscription> {
  return toSubscription(await request<RawSubscription>('POST', '/my/subscriptions', input))
}

export async function updateSubscription(id: EntityId, input: SubscriptionInput): Promise<Subscription> {
  return toSubscription(await request<RawSubscription>('PUT', `/my/subscriptions/${encodeURIComponent(id)}`, input))
}

export const deleteSubscription = (id: EntityId): Promise<{ ok: true }> =>
  request<{ ok: true }>('DELETE', `/my/subscriptions/${encodeURIComponent(id)}`)

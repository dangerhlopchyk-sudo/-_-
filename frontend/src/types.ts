
export enum Currency {
  UAH = 'UAH',
  USD = 'USD',
  EUR = 'EUR',
}

export enum Category {
  Ai = 'ai',
  Streaming = 'streaming',
  Cloud = 'cloud',
  Apps = 'apps',
  Music = 'music',
  Games = 'games',
  Other = 'other',
}

export enum BillingPeriod {
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

export type EntityId = string
export type IsoDate = string
export type SectionAnchor = string

export type SortKey = 'nextBillingDate' | 'monthlyUah' | 'name'
export type SortOrder = 'asc' | 'desc'
export type AuthMode = 'login' | 'register'
export type Urgency = 'critical' | 'warning' | 'notice' | 'calm'
export type RatesSource = 'nbu' | 'fallback'

export type DateParts = [year: number, month: number, day: number]

export interface User {
  id: EntityId
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Subscription {
  id: EntityId
  name: string
  cost: number
  currency: Currency
  category: Category
  period: BillingPeriod
  nextBillingDate: IsoDate
  daysLeft: number
  monthlyUah: number
}

export type SubscriptionInput = Omit<Subscription, 'id' | 'daysLeft' | 'monthlyUah'>

export interface CategoryTotal {
  category: Category
  monthly: number
}

export interface NextCharge {
  name: string
  nextBillingDate: IsoDate
  daysLeft: number
}

export type RatesMap = Record<Currency, number>

export interface Summary {
  count: number
  monthly: number
  yearly: number
  byCategory: CategoryTotal[]
  nextCharge: NextCharge | null
  rates: RatesMap
  ratesDate: IsoDate
  ratesSource: RatesSource
}

export interface FilterState {
  category: Category | 'all'
  period: BillingPeriod | 'all'
  sort: SortKey
  order: SortOrder
}

export type FilterPatch = Partial<FilterState>

export interface Preset {
  readonly name: string
  readonly domain: string
  readonly category: Category
  readonly currency: Currency
  readonly period: BillingPeriod
}

export interface RawSubscription extends Omit<Subscription, 'currency' | 'category' | 'period'> {
  currency: string
  category: string
  period: string
}

export interface RawSummary extends Omit<Summary, 'byCategory' | 'rates' | 'ratesSource'> {
  byCategory: { category: string; monthly: number }[]
  rates: Record<string, number>
  ratesSource: string
}

export type FieldErrors = Partial<Record<keyof SubscriptionInput, string>>

export interface BlockIdentity {
  id?: string
  anchor?: SectionAnchor
}

export interface BlockHeading {
  badge?: string
  title: string
  subtitle?: string
}

export type BaseSectionBlock = BlockIdentity & BlockHeading

export type AuthBlock = BaseSectionBlock & { type: 'auth'; mode: AuthMode }
export type SummaryBlock = BaseSectionBlock & { type: 'summary'; summary: Summary }
export type ToolbarBlock = BaseSectionBlock & { type: 'toolbar'; filters: Readonly<FilterState>; total: number; shown: number }
export type CardsBlock = BaseSectionBlock & { type: 'cards'; items: Subscription[]; hasFilters: boolean }
export type FormBlock = BaseSectionBlock & { type: 'form'; editing: Subscription | null; presets: readonly Preset[] }

export type PageBlock = AuthBlock | SummaryBlock | ToolbarBlock | CardsBlock | FormBlock
export type BlockType = PageBlock['type']

export type UIState<T> =
  | { status: 'loading'; message: string }
  | { status: 'ready'; data: T }
  | { status: 'error'; errorMessage: string; endpointUrl: string }

export interface AppData {
  user: User
  subscriptions: Subscription[]
  summary: Summary
}

export type AppState = { status: 'guest' } | UIState<AppData>

export type BlockRenderer<B extends PageBlock = PageBlock> = (block: B) => string

export type BlockRendererRegistry = {
  [K in BlockType]: BlockRenderer<Extract<PageBlock, { type: K }>>
}

export type ApiGetFunction = <T>(endpoint: string) => Promise<T>

export type Action =
  | 'switch-auth'
  | 'logout'
  | 'retry'
  | 'toggle-order'
  | 'reset-filters'
  | 'add'
  | 'edit'
  | 'delete'
  | 'close-form'
  | 'pick-preset'
  | 'pick-custom'

export type ActionHandler = (trigger: HTMLElement, event: MouseEvent) => void

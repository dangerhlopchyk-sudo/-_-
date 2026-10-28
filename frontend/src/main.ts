import './styles/base.css'
import {
  ApiError,
  createSubscription,
  deleteSubscription,
  getMe,
  getSubscriptions,
  getSummary,
  login,
  register,
  tokenStore,
  updateSubscription,
} from './api'
import { esc, findById } from './format'
import { isBillingPeriod, isCategory } from './guards'
import { renderFooter } from './layout/footer'
import { renderHeader } from './layout/header'
import { PRESETS, findPreset } from './presets'
import { renderBlocks } from './renderBlocks'
import type {
  Action,
  ActionHandler,
  AppState,
  AuthMode,
  FilterPatch,
  FilterState,
  PageBlock,
  SortKey,
  Subscription,
  User,
} from './types'
import { evaluatePassword, validateEmail, validateSubscription } from './validators'

const container = document.querySelector<HTMLDivElement>('#app')
if (!container) throw new Error('Контейнер #app не знайдено в index.html')
const root: HTMLDivElement = container

const DEFAULT_FILTERS: Readonly<FilterState> = { category: 'all', period: 'all', sort: 'nextBillingDate', order: 'asc' }
const SORT_KEYS: readonly SortKey[] = ['nextBillingDate', 'monthlyUah', 'name']
const isSortKey = (value: string): value is SortKey => (SORT_KEYS as readonly string[]).includes(value)

interface ViewState {
  authMode: AuthMode
  filters: FilterState
  formOpen: boolean
  editing: Subscription | null
}

const view: ViewState = { authMode: 'login', filters: { ...DEFAULT_FILTERS }, formOpen: false, editing: null }

let state: AppState = { status: 'guest' }
let currentUser: User | null = null

function compare(a: Subscription, b: Subscription, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name, 'uk')
    case 'monthlyUah':
      return a.monthlyUah - b.monthlyUah
    case 'nextBillingDate':
      return a.daysLeft - b.daysLeft
  }
}

function visibleItems(items: Subscription[], filters: FilterState): Subscription[] {
  const direction = filters.order === 'asc' ? 1 : -1
  return items
    .filter((item) => filters.category === 'all' || item.category === filters.category)
    .filter((item) => filters.period === 'all' || item.period === filters.period)
    .sort((a, b) => compare(a, b, filters.sort) * direction)
}

function updateFilters(patch: FilterPatch): void {
  view.filters = { ...view.filters, ...patch }
  render()
}

function renderLoading(message: string): string {
  const skeleton = '<div class="skeleton"></div>'.repeat(6)
  return `
    ${renderHeader(currentUser)}
    <main class="container">
      <p class="state-badge"><span class="spinner" aria-hidden="true"></span> Завантаження · ${esc(message)}</p>
      <div class="cards">${skeleton}</div>
    </main>`
}

function renderError(message: string, endpointUrl: string): string {
  return `
    ${renderHeader(currentUser)}
    <main class="container">
      <section class="error-card" role="alert">
        <h2>Щось пішло не так під час звернення до API</h2>
        <p>${esc(message)}</p>
        <p class="muted">Ендпоінт: <code>${esc(endpointUrl)}</code></p>
        <button class="btn btn--primary" type="button" data-action="retry">Спробувати знову</button>
      </section>
    </main>`
}

function render(): void {
  switch (state.status) {
    case 'guest': {
      document.title = 'Вхід — Керування Підписками'
      const isRegister = view.authMode === 'register'
      root.innerHTML = renderBlocks([
        {
          type: 'auth',
          mode: view.authMode,
          badge: 'Керування Підписками',
          title: isRegister ? 'Створення акаунта' : 'Вхід до системи',
          subtitle: isRegister
            ? 'Зареєструйтесь, щоб вести власний список підписок.'
            : 'Увійдіть, щоб побачити свої підписки та витрати.',
        },
      ])
      break
    }
    case 'loading':
      document.title = 'Завантаження… — Керування Підписками'
      root.innerHTML = renderLoading(state.message)
      break
    case 'error':
      document.title = 'Помилка — Керування Підписками'
      root.innerHTML = renderError(state.errorMessage, state.endpointUrl)
      break
    case 'ready': {
      const { user, subscriptions, summary } = state.data
      const visible = visibleItems(subscriptions, view.filters)
      const hasFilters = view.filters.category !== 'all' || view.filters.period !== 'all'
      const blocks: PageBlock[] = [
        { type: 'summary', anchor: 'summary', title: 'Мої витрати', subtitle: 'Автоматичний підрахунок за активними підписками', summary },
        { type: 'toolbar', anchor: 'toolbar', title: 'Мої підписки', filters: view.filters, total: subscriptions.length, shown: visible.length },
        { type: 'cards', anchor: 'cards', title: 'Підписки', items: visible, hasFilters },
      ]
      if (view.formOpen) {
        blocks.push({
          type: 'form',
          title: view.editing ? 'Редагування підписки' : 'Нова підписка',
          editing: view.editing,
          presets: PRESETS,
        })
      }
      document.title = 'Мої підписки — Керування Підписками'
      root.innerHTML = `${renderHeader(user)}<main class="container">${renderBlocks(blocks)}</main>${renderFooter()}`
      break
    }
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Невідома помилка'
}

function setError(error: unknown): void {
  state = {
    status: 'error',
    errorMessage: describeError(error),
    endpointUrl: error instanceof ApiError ? error.endpointUrl : '—',
  }
}

const isUnauthorized = (error: unknown): boolean => error instanceof ApiError && error.status === 401

function logout(): void {
  tokenStore.clear()
  currentUser = null
  view.formOpen = false
  view.editing = null
  view.filters = { ...DEFAULT_FILTERS }
  state = { status: 'guest' }
  render()
}

async function loadDashboard(showLoading = true): Promise<void> {
  if (!currentUser) return logout()
  if (showLoading) {
    state = { status: 'loading', message: 'отримуємо підписки з API' }
    render()
  }
  try {
    const [subscriptions, summary] = await Promise.all([getSubscriptions(), getSummary()])
    state = { status: 'ready', data: { user: currentUser, subscriptions, summary } }
  } catch (error) {
    if (isUnauthorized(error)) return logout()
    setError(error)
  }
  render()
}

async function bootstrap(): Promise<void> {
  if (!tokenStore.get()) return logout()
  state = { status: 'loading', message: 'перевіряємо вхід' }
  render()
  try {
    currentUser = await getMe()
    await loadDashboard(false)
  } catch (error) {
    if (isUnauthorized(error)) return logout()
    setError(error)
    render()
  }
}

function showError(selector: string, message: string): void {
  const element = root.querySelector<HTMLElement>(selector)
  if (!element) return
  element.textContent = message
  element.hidden = false
}

function formField<T extends HTMLInputElement | HTMLSelectElement>(name: string): T | null {
  return root.querySelector<T>(`#sub-form [name="${name}"]`)
}

function setFormValue(name: string, value: string): void {
  const field = formField(name)
  if (field) field.value = value
}

function markSelectedPreset(active: HTMLElement | null): void {
  root.querySelectorAll<HTMLElement>('.preset').forEach((preset) => {
    preset.classList.toggle('is-selected', preset === active)
  })
}

function updatePasswordHints(form: HTMLFormElement): void {
  const password = form.querySelector<HTMLInputElement>('[name="password"]')?.value ?? ''
  const email = form.querySelector<HTMLInputElement>('[name="email"]')?.value ?? ''
  const report = evaluatePassword(password, email)

  for (const { rule, passed } of report.results) {
    form.querySelector<HTMLElement>(`[data-rule="${rule.id}"]`)?.classList.toggle('is-ok', passed && password !== '')
  }
  const meter = form.querySelector<HTMLElement>('#password-meter')
  const fill = form.querySelector<HTMLElement>('.meter__fill')
  const label = form.querySelector<HTMLElement>('#password-meter-label')
  if (!meter || !fill || !label) return

  const empty = password === ''
  meter.dataset.strength = empty ? 'empty' : report.strength
  fill.style.width = empty ? '0%' : `${(report.passedCount / report.results.length) * 100}%`
  label.textContent = empty
    ? 'Введіть пароль'
    : report.strength === 'strong'
      ? 'Надійний пароль'
      : report.strength === 'medium'
        ? 'Пароль прийнятний; виконайте решту пунктів для повної надійності'
        : 'Слабкий пароль: виконайте обовʼязкові пункти'
}

async function submitAuth(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form)
  const text = (key: string): string => String(data.get(key) ?? '')
  const email = text('email').trim()
  const password = text('password')
  const isRegister = form.dataset.mode === 'register'

  if (isRegister) {
    const name = text('name').trim()
    const emailError = validateEmail(email)
    const report = evaluatePassword(password, email)
    const failed = report.results.find((result) => !result.passed && result.rule.required)
    const error =
      (name.length > 60 ? 'Імʼя має містити до 60 символів' : null) ??
      emailError ??
      (failed ? `Пароль не підходить: ${failed.rule.label.toLowerCase()}` : null) ??
      (password !== text('passwordConfirm') ? 'Паролі не збігаються' : null)
    if (error) return showError('#auth-error', error)
  } else if (!email || !password) {
    return showError('#auth-error', 'Введіть email і пароль')
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (button) button.disabled = true
  try {
    const result = isRegister ? await register(text('name').trim(), email, password) : await login(email, password)
    tokenStore.set(result.token)
    currentUser = result.user
    await loadDashboard()
  } catch (error) {
    showError('#auth-error', describeError(error))
    if (button) button.disabled = false
  }
}

async function submitSubscription(form: HTMLFormElement): Promise<void> {
  const raw: Record<string, string> = {}
  new FormData(form).forEach((value, key) => {
    raw[key] = String(value).trim()
  })

  const { value, errors } = validateSubscription(raw)
  if (!value) {
    const [firstError] = Object.values(errors)
    return showError('#form-error', firstError ?? 'Перевірте дані форми')
  }

  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (button) button.disabled = true
  try {
    const id = form.dataset.id
    if (id) await updateSubscription(id, value)
    else await createSubscription(value)
    view.formOpen = false
    view.editing = null
    await loadDashboard(false)
  } catch (error) {
    if (isUnauthorized(error)) return logout()
    showError('#form-error', describeError(error))
    if (button) button.disabled = false
  }
}

async function removeSubscription(id: string): Promise<void> {
  if (state.status !== 'ready') return
  const sub = findById(state.data.subscriptions, id)
  if (!sub || !window.confirm(`Видалити підписку «${sub.name}»?`)) return
  try {
    await deleteSubscription(id)
    await loadDashboard(false)
  } catch (error) {
    if (isUnauthorized(error)) return logout()
    window.alert(describeError(error))
  }
}

function closeForm(): void {
  view.formOpen = false
  view.editing = null
  render()
}

const actions: Record<Action, ActionHandler> = {
  'switch-auth': () => {
    view.authMode = view.authMode === 'login' ? 'register' : 'login'
    render()
  },
  logout: () => logout(),
  retry: () => void (currentUser ? loadDashboard() : bootstrap()),
  'toggle-order': () => updateFilters({ order: view.filters.order === 'asc' ? 'desc' : 'asc' }),
  'reset-filters': () => updateFilters({ category: 'all', period: 'all' }),
  add: () => {
    view.editing = null
    view.formOpen = true
    render()
  },
  edit: (trigger) => {
    if (state.status !== 'ready') return
    view.editing = findById(state.data.subscriptions, trigger.dataset.id ?? '') ?? null
    view.formOpen = view.editing !== null
    render()
  },
  delete: (trigger) => void removeSubscription(trigger.dataset.id ?? ''),
  'close-form': (trigger, event) => {
    if (trigger.classList.contains('modal') && event.target !== trigger) return
    closeForm()
  },
  'pick-preset': (trigger) => {
    const preset = findPreset(trigger.dataset.preset ?? '')
    if (!preset) return
    setFormValue('name', preset.name)
    setFormValue('category', preset.category)
    setFormValue('currency', preset.currency)
    setFormValue('period', preset.period)
    markSelectedPreset(trigger)
    formField('cost')?.focus()
  },
  'pick-custom': (trigger) => {
    setFormValue('name', '')
    markSelectedPreset(trigger)
    formField('name')?.focus()
  },
}

const isAction = (value: string | undefined): value is Action =>
  value !== undefined && Object.keys(actions).includes(value)

root.addEventListener('click', (event: MouseEvent) => {
  if (!(event.target instanceof HTMLElement)) return
  const trigger = event.target.closest<HTMLElement>('[data-action]')
  const action = trigger?.dataset.action
  if (trigger && isAction(action)) actions[action](trigger, event)
})

root.addEventListener('change', (event: Event) => {
  const target = event.target
  if (target instanceof HTMLSelectElement) {
    switch (target.dataset.filter) {
      case 'category':
        return updateFilters({ category: isCategory(target.value) ? target.value : 'all' })
      case 'period':
        return updateFilters({ period: isBillingPeriod(target.value) ? target.value : 'all' })
      case 'sort':
        return updateFilters({ sort: isSortKey(target.value) ? target.value : DEFAULT_FILTERS.sort })
    }
  } else if (target instanceof HTMLInputElement && target.dataset.toggle === 'password') {
    root.querySelectorAll<HTMLInputElement>('input[data-secret]').forEach((input) => {
      input.type = target.checked ? 'text' : 'password'
    })
  }
})

root.addEventListener('input', (event: Event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const form = target.closest<HTMLFormElement>('#auth-form')
  if (form?.dataset.mode === 'register' && (target.name === 'password' || target.name === 'email')) {
    updatePasswordHints(form)
  }
})

root.addEventListener('submit', (event: SubmitEvent) => {
  event.preventDefault()
  if (!(event.target instanceof HTMLFormElement)) return
  if (event.target.id === 'auth-form') void submitAuth(event.target)
  else if (event.target.id === 'sub-form') void submitSubscription(event.target)
})

root.addEventListener(
  'error',
  (event: Event) => {
    if (event.target instanceof HTMLImageElement) event.target.remove()
  },
  true,
)

document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && view.formOpen) closeForm()
})

void bootstrap()

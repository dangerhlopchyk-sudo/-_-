
import type { Endpoint, PayloadRequest } from 'payload'
import { buildSummary, decorate, parseSubscriptionInput, passwordIssue, shiftToFuture } from './lib/billing'
import type { SubscriptionDto } from './lib/billing'
import { getRates } from './lib/rates'
import type { RatesInfo } from './lib/rates'

type AnyDoc = Record<string, any>

const json = (data: unknown, status = 200): Response => Response.json(data, { status })
const fail = (status: number, error: string): Response => json({ error }, status)

const readBody = async (req: PayloadRequest): Promise<AnyDoc> => {
  try {
    return ((await req.json?.()) ?? {}) as AnyDoc
  } catch {
    return {}
  }
}

const userView = (user: AnyDoc) => ({
  id: String(user.id),
  name: user.name ?? '',
  email: user.email,
  role: user.role ?? 'user',
})

const toId = (raw: string | undefined): string | number | undefined =>
  raw && /^\d+$/.test(raw) ? Number(raw) : raw

function toDto(doc: AnyDoc, rates: Record<string, number>): SubscriptionDto {
  return decorate(
    {
      id: String(doc.id),
      name: doc.name,
      cost: Number(doc.cost),
      currency: doc.currency,
      category: doc.category,
      period: doc.period,
      nextBillingDate: String(doc.nextBillingDate).slice(0, 10),
    },
    rates,
  )
}

async function listFor(req: PayloadRequest): Promise<{ items: SubscriptionDto[]; ratesInfo: RatesInfo }> {
  const ratesInfo = await getRates()
  const result = await req.payload.find({
    collection: 'subscriptions',
    where: { owner: { equals: req.user!.id } },
    pagination: false,
    depth: 0,
    sort: 'nextBillingDate',
    overrideAccess: true,
  })
  const items: SubscriptionDto[] = []
  for (const doc of result.docs as AnyDoc[]) {
    const day = String(doc.nextBillingDate).slice(0, 10)
    const shifted = shiftToFuture(day, doc.period)
    if (shifted !== day) {
      await req.payload.update({
        collection: 'subscriptions',
        id: doc.id,
        data: { nextBillingDate: `${shifted}T00:00:00.000Z` },
        overrideAccess: true,
      })
      doc.nextBillingDate = shifted
    }
    items.push(toDto(doc, ratesInfo.rates))
  }
  return { items, ratesInfo }
}

async function findOwned(req: PayloadRequest): Promise<AnyDoc | null> {
  const id = toId(req.routeParams?.id as string | undefined)
  if (id === undefined) return null
  try {
    const doc = (await req.payload.findByID({
      collection: 'subscriptions',
      id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc
    return String(doc.owner) === String(req.user!.id) ? doc : null
  } catch {
    return null
  }
}

const unauthorized = (): Response => fail(401, 'Потрібна авторизація')

export const endpoints: Endpoint[] = [
  {
    path: '/auth/register',
    method: 'post',
    handler: async (req) => {
      const body = await readBody(req)
      const email = String(body.email ?? '').trim().toLowerCase()
      const password = String(body.password ?? '')
      const name = String(body.name ?? '').trim()
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, 'Некоректний email')
      const issue = passwordIssue(password)
      if (issue) return fail(400, issue)
      const exists = await req.payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (exists.totalDocs > 0) return fail(409, 'Користувач із таким email уже існує')
      await req.payload.create({ collection: 'users', data: { email, password, name }, overrideAccess: true })
      const session = await req.payload.login({ collection: 'users', data: { email, password } })
      return json({ token: session.token, user: userView(session.user as AnyDoc) }, 201)
    },
  },
  {
    path: '/auth/login',
    method: 'post',
    handler: async (req) => {
      const body = await readBody(req)
      try {
        const session = await req.payload.login({
          collection: 'users',
          data: { email: String(body.email ?? '').trim().toLowerCase(), password: String(body.password ?? '') },
        })
        return json({ token: session.token, user: userView(session.user as AnyDoc) })
      } catch {
        return fail(401, 'Невірний email або пароль')
      }
    },
  },
  {
    path: '/auth/me',
    method: 'get',
    handler: (req) => (req.user ? json({ user: userView(req.user as AnyDoc) }) : unauthorized()),
  },
  {
    path: '/rates',
    method: 'get',
    handler: async () => json(await getRates()),
  },
  {
    path: '/my/subscriptions',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return unauthorized()
      const { items } = await listFor(req)
      return json({ items })
    },
  },
  {
    path: '/my/summary',
    method: 'get',
    handler: async (req) => {
      if (!req.user) return unauthorized()
      const { items, ratesInfo } = await listFor(req)
      return json(buildSummary(items, ratesInfo))
    },
  },
  {
    path: '/my/subscriptions',
    method: 'post',
    handler: async (req) => {
      if (!req.user) return unauthorized()
      const parsed = parseSubscriptionInput(await readBody(req))
      if (parsed.error !== undefined) return fail(400, parsed.error)
      const doc = (await req.payload.create({
        collection: 'subscriptions',
        data: { ...parsed.value, nextBillingDate: `${parsed.value.nextBillingDate}T00:00:00.000Z`, owner: req.user.id },
        overrideAccess: true,
      })) as AnyDoc
      const { rates } = await getRates()
      return json(toDto(doc, rates), 201)
    },
  },
  {
    path: '/my/subscriptions/:id',
    method: 'put',
    handler: async (req) => {
      if (!req.user) return unauthorized()
      const existing = await findOwned(req)
      if (!existing) return fail(404, 'Підписку не знайдено')
      const parsed = parseSubscriptionInput(await readBody(req))
      if (parsed.error !== undefined) return fail(400, parsed.error)
      const doc = (await req.payload.update({
        collection: 'subscriptions',
        id: existing.id,
        data: { ...parsed.value, nextBillingDate: `${parsed.value.nextBillingDate}T00:00:00.000Z` },
        overrideAccess: true,
      })) as AnyDoc
      const { rates } = await getRates()
      return json(toDto(doc, rates))
    },
  },
  {
    path: '/my/subscriptions/:id',
    method: 'delete',
    handler: async (req) => {
      if (!req.user) return unauthorized()
      const existing = await findOwned(req)
      if (!existing) return fail(404, 'Підписку не знайдено')
      await req.payload.delete({ collection: 'subscriptions', id: existing.id, overrideAccess: true })
      return json({ ok: true })
    },
  },
]

// Допоміжний Express REST API з демо-даними (JSON-файли у data/).
// Повторює контракт кастомних ендпоінтів CMS (cms/src/endpoints.ts),
// тому фронтенд працює з обома бекендами — змінюється лише VITE_API_URL.

import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addDaysISO,
  buildSummary,
  decorate,
  parseSubscriptionInput,
  passwordIssue,
  shiftToFuture,
} from './lib/billing.js'
import { getRates } from './lib/rates.js'

const PORT = Number(process.env.PORT) || 3000
const SECRET = process.env.AUTH_SECRET || 'demo-secret-change-me'
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const DEMO_USER = { id: 'u_demo', name: 'Демо користувач', email: 'demo@example.com', password: 'demo1234' }

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data')
const usersFile = path.join(dataDir, 'users.json')
const subsFile = path.join(dataDir, 'subscriptions.json')

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return []
  }
}
function writeJson(file, value) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2))
  } catch (error) {
    console.warn('Не вдалося зберегти', path.basename(file), '-', error.message)
  }
}

let users = readJson(usersFile)
let subscriptions = readJson(subsFile)

// ---------- Паролі та токени ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 32).toString('hex') }
}
function checkPassword(user, password) {
  const { hash } = hashPassword(password, user.salt)
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.hash))
}
function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}
function issueToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url')
  return `${payload}.${sign(payload)}`
}
function verifyToken(token) {
  const [payload, signature] = String(token).split('.')
  if (!payload || !signature || sign(payload) !== signature) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return data.exp > Date.now() ? data.uid : null
  } catch {
    return null
  }
}
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.id === DEMO_USER.id ? 'admin' : 'user' })

// ---------- Демо-дані (створюються при першому запуску) ----------
if (!users.some((u) => u.email === DEMO_USER.email)) {
  users.push({ id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email, ...hashPassword(DEMO_USER.password) })
  writeJson(usersFile, users)
}
if (subscriptions.length === 0) {
  const demo = [
    ['Netflix', 299, 'UAH', 'streaming', 'monthly', 1],
    ['Spotify', 99, 'UAH', 'music', 'monthly', 3],
    ['iCloud 200 GB', 99, 'UAH', 'cloud', 'monthly', 6],
    ['YouTube Premium', 129, 'UAH', 'streaming', 'monthly', 12],
    ['ChatGPT Plus', 20, 'USD', 'ai', 'monthly', 25],
    ['Xbox Game Pass', 11.99, 'EUR', 'games', 'monthly', 40],
  ]
  subscriptions = demo.map(([name, cost, currency, category, period, offset], i) => ({
    id: `s_demo_${i + 1}`,
    ownerId: DEMO_USER.id,
    name, cost, currency, category, period,
    nextBillingDate: addDaysISO(offset),
  }))
  writeJson(subsFile, subscriptions)
}

// ---------- Express ----------
const app = express()
app.use(cors())
app.use(express.json())

function requireAuth(req, res, next) {
  const token = (req.headers.authorization ?? '').replace(/^(JWT|Bearer)\s+/i, '')
  const userId = verifyToken(token)
  const user = users.find((u) => u.id === userId)
  if (!user) return res.status(401).json({ error: 'Потрібна авторизація' })
  req.user = user
  next()
}

async function listFor(user) {
  const { rates, ...ratesInfo } = await getRates()
  let changed = false
  const items = []
  for (const sub of subscriptions.filter((s) => s.ownerId === user.id)) {
    const shifted = shiftToFuture(sub.nextBillingDate, sub.period)
    if (shifted !== sub.nextBillingDate) {
      sub.nextBillingDate = shifted // автоматичне зміщення дати після списання
      changed = true
    }
    const { ownerId, ...dto } = sub
    items.push(decorate(dto, rates))
  }
  if (changed) writeJson(subsFile, subscriptions)
  return { items, ratesInfo: { ...ratesInfo, rates } }
}

app.get('/', (_req, res) => res.json({ service: 'subscriptions-backend', status: 'ok' }))

// --- Авторизація ---
app.post('/api/auth/register', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const name = String(req.body?.name ?? '').trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Некоректний email' })
  const issue = passwordIssue(password)
  if (issue) return res.status(400).json({ error: issue })
  if (users.some((u) => u.email === email)) return res.status(409).json({ error: 'Користувач із таким email уже існує' })
  const user = { id: `u_${crypto.randomUUID()}`, name, email, ...hashPassword(password) }
  users.push(user)
  writeJson(usersFile, users)
  res.status(201).json({ token: issueToken(user.id), user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const user = users.find((u) => u.email === email)
  if (!user || !checkPassword(user, String(req.body?.password ?? ''))) {
    return res.status(401).json({ error: 'Невірний email або пароль' })
  }
  res.json({ token: issueToken(user.id), user: publicUser(user) })
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

// --- Курси НБУ ---
app.get('/api/rates', async (_req, res) => res.json(await getRates()))

// --- Підписки поточного користувача ---
app.get('/api/my/subscriptions', requireAuth, async (req, res) => {
  const { items } = await listFor(req.user)
  res.json({ items })
})

app.get('/api/my/summary', requireAuth, async (req, res) => {
  const { items, ratesInfo } = await listFor(req.user)
  res.json(buildSummary(items, ratesInfo))
})

app.post('/api/my/subscriptions', requireAuth, async (req, res) => {
  const parsed = parseSubscriptionInput(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const sub = { id: `s_${crypto.randomUUID()}`, ownerId: req.user.id, ...parsed.value }
  subscriptions.push(sub)
  writeJson(subsFile, subscriptions)
  const { rates } = await getRates()
  const { ownerId, ...dto } = sub
  res.status(201).json(decorate(dto, rates))
})

app.put('/api/my/subscriptions/:id', requireAuth, async (req, res) => {
  const sub = subscriptions.find((s) => s.id === req.params.id && s.ownerId === req.user.id)
  if (!sub) return res.status(404).json({ error: 'Підписку не знайдено' })
  const parsed = parseSubscriptionInput(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  Object.assign(sub, parsed.value)
  writeJson(subsFile, subscriptions)
  const { rates } = await getRates()
  const { ownerId, ...dto } = sub
  res.json(decorate(dto, rates))
})

app.delete('/api/my/subscriptions/:id', requireAuth, (req, res) => {
  const index = subscriptions.findIndex((s) => s.id === req.params.id && s.ownerId === req.user.id)
  if (index === -1) return res.status(404).json({ error: 'Підписку не знайдено' })
  subscriptions.splice(index, 1)
  writeJson(subsFile, subscriptions)
  res.json({ ok: true })
})

app.use('/api', (_req, res) => res.status(404).json({ error: 'Маршрут не знайдено' }))

app.listen(PORT, () => {
  console.log(`Backend запущено: http://localhost:${PORT}`)
  console.log(`Демо-акаунт: ${DEMO_USER.email} / ${DEMO_USER.password}`)
})

// Курси НБУ (https://bank.gov.ua) з кешем на 6 годин та запасними значеннями.

const CACHE_MS = 6 * 60 * 60 * 1000
const FALLBACK = { UAH: 1, USD: 41.5, EUR: 48.5 }
let cache = null

async function fetchRate(code) {
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&json`
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`NBU HTTP ${response.status}`)
  const [row] = await response.json()
  if (!row || typeof row.rate !== 'number') throw new Error('NBU: неочікувана відповідь')
  const [dd, mm, yyyy] = String(row.exchangedate).split('.')
  return { rate: row.rate, date: `${yyyy}-${mm}-${dd}` }
}

export async function getRates() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  try {
    const [usd, eur] = await Promise.all([fetchRate('USD'), fetchRate('EUR')])
    const data = { date: usd.date, source: 'nbu', rates: { UAH: 1, USD: usd.rate, EUR: eur.rate } }
    cache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.warn('Не вдалося отримати курс НБУ, використано запасні значення:', error.message)
    return { date: new Date().toISOString().slice(0, 10), source: 'fallback', rates: { ...FALLBACK } }
  }
}

// Курси НБУ (https://bank.gov.ua) з кешем на 6 годин та запасними значеннями.

export type RatesInfo = {
  date: string
  source: 'nbu' | 'fallback'
  rates: Record<string, number>
}

const CACHE_MS = 6 * 60 * 60 * 1000
const FALLBACK: Record<string, number> = { UAH: 1, USD: 41.5, EUR: 48.5 }
let cache: { at: number; data: RatesInfo } | null = null

async function fetchRate(code: string): Promise<{ rate: number; date: string }> {
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&json`
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw new Error(`NBU HTTP ${response.status}`)
  const [row] = (await response.json()) as { rate?: number; exchangedate?: string }[]
  if (!row || typeof row.rate !== 'number') throw new Error('NBU: неочікувана відповідь')
  const [dd, mm, yyyy] = String(row.exchangedate).split('.')
  return { rate: row.rate, date: `${yyyy}-${mm}-${dd}` }
}

export async function getRates(): Promise<RatesInfo> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  try {
    const [usd, eur] = await Promise.all([fetchRate('USD'), fetchRate('EUR')])
    const data: RatesInfo = { date: usd.date, source: 'nbu', rates: { UAH: 1, USD: usd.rate, EUR: eur.rate } }
    cache = { at: Date.now(), data }
    return data
  } catch (error) {
    console.warn('Не вдалося отримати курс НБУ, використано запасні значення:', error)
    return { date: new Date().toISOString().slice(0, 10), source: 'fallback', rates: { ...FALLBACK } }
  }
}

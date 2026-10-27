import { BillingPeriod, Category, Currency } from './types'
import type { Preset } from './types'

const { Ai, Streaming, Cloud, Apps, Music, Games, Other } = Category
const { UAH, USD } = Currency
const { Monthly, Yearly } = BillingPeriod

// Готові популярні сервіси. Логотипи підтягуються за доменом (див. logoUrl у format.ts).
export const PRESETS: readonly Preset[] = [
  { name: 'Netflix', domain: 'netflix.com', category: Streaming, currency: UAH, period: Monthly },
  { name: 'YouTube Premium', domain: 'youtube.com', category: Streaming, currency: UAH, period: Monthly },
  { name: 'Disney+', domain: 'disneyplus.com', category: Streaming, currency: USD, period: Monthly },
  { name: 'Max', domain: 'max.com', category: Streaming, currency: USD, period: Monthly },
  { name: 'Prime Video', domain: 'primevideo.com', category: Streaming, currency: USD, period: Monthly },
  { name: 'Spotify', domain: 'spotify.com', category: Music, currency: UAH, period: Monthly },
  { name: 'Apple Music', domain: 'music.apple.com', category: Music, currency: UAH, period: Monthly },
  { name: 'ChatGPT Plus', domain: 'chatgpt.com', category: Ai, currency: USD, period: Monthly },
  { name: 'Claude Pro', domain: 'claude.ai', category: Ai, currency: USD, period: Monthly },
  { name: 'Gemini Advanced', domain: 'gemini.google.com', category: Ai, currency: USD, period: Monthly },
  { name: 'Perplexity Pro', domain: 'perplexity.ai', category: Ai, currency: USD, period: Monthly },
  { name: 'Midjourney', domain: 'midjourney.com', category: Ai, currency: USD, period: Monthly },
  { name: 'GitHub Copilot', domain: 'github.com', category: Ai, currency: USD, period: Monthly },
  { name: 'Notion', domain: 'notion.so', category: Apps, currency: USD, period: Yearly },
  { name: 'Canva', domain: 'canva.com', category: Apps, currency: USD, period: Yearly },
  { name: 'Adobe Creative Cloud', domain: 'adobe.com', category: Apps, currency: USD, period: Monthly },
  { name: 'Duolingo', domain: 'duolingo.com', category: Apps, currency: USD, period: Yearly },
  { name: 'Telegram Premium', domain: 'telegram.org', category: Apps, currency: UAH, period: Monthly },
  { name: 'iCloud+', domain: 'icloud.com', category: Cloud, currency: UAH, period: Monthly },
  { name: 'Google One', domain: 'one.google.com', category: Cloud, currency: UAH, period: Monthly },
  { name: 'Dropbox', domain: 'dropbox.com', category: Cloud, currency: USD, period: Monthly },
  { name: 'Microsoft 365', domain: 'microsoft.com', category: Cloud, currency: UAH, period: Yearly },
  { name: 'Xbox Game Pass', domain: 'xbox.com', category: Games, currency: UAH, period: Monthly },
  { name: 'PlayStation Plus', domain: 'playstation.com', category: Games, currency: UAH, period: Monthly },
  { name: 'Nintendo Switch Online', domain: 'nintendo.com', category: Games, currency: USD, period: Yearly },
]

export const findPreset = (name: string): Preset | undefined => {
  const needle = name.trim().toLowerCase()
  return PRESETS.find((preset) => preset.name.toLowerCase() === needle)
}

export const CUSTOM_CATEGORY: Category = Other

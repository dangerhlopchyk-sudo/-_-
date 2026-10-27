import './summary.css'
import { CATEGORY_LABELS, daysLabel, esc, formatDate, money } from '../format'
import { Currency } from '../types'
import type { BlockRenderer, SummaryBlock } from '../types'

export const renderSummary: BlockRenderer<SummaryBlock> = ({ summary, title, subtitle, anchor }) => {
  const next = summary.nextCharge
  const max = Math.max(...summary.byCategory.map((c) => c.monthly), 1)
  const bars = summary.byCategory
    .map(
      (c) => `
        <li class="bar">
          <span class="bar__label">${esc(CATEGORY_LABELS[c.category])}</span>
          <span class="bar__track"><span class="bar__fill" style="width:${Math.max((c.monthly / max) * 100, 4)}%"></span></span>
          <span class="bar__value">${money(c.monthly, Currency.UAH)}</span>
        </li>`,
    )
    .join('')

  const usd = summary.rates[Currency.USD].toFixed(2)
  const eur = summary.rates[Currency.EUR].toFixed(2)
  const ratesNote =
    summary.ratesSource === 'nbu'
      ? `Курс НБУ на ${formatDate(summary.ratesDate)}: 1 USD = ${usd} ₴, 1 EUR = ${eur} ₴`
      : `Курс НБУ тимчасово недоступний, використано орієнтовний: 1 USD ≈ ${usd} ₴, 1 EUR ≈ ${eur} ₴`

  return `
    <section class="summary" ${anchor ? `id="${esc(anchor)}"` : ''}>
      <div class="summary__head">
        <h2 class="section-title">${esc(title)}</h2>
        ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ''}
      </div>
      <div class="stats">
        <article class="stat stat--hero">
          <span class="stat__label">Витрати на місяць</span>
          <strong class="stat__value">${money(summary.monthly, Currency.UAH)}</strong>
          <span class="stat__hint">на рік: ${money(summary.yearly, Currency.UAH)}</span>
        </article>
        <article class="stat">
          <span class="stat__label">Витрати на рік</span>
          <strong class="stat__value">${money(summary.yearly, Currency.UAH)}</strong>
        </article>
        <article class="stat">
          <span class="stat__label">Активних підписок</span>
          <strong class="stat__value">${summary.count}</strong>
        </article>
        <article class="stat">
          <span class="stat__label">Найближче списання</span>
          <strong class="stat__value stat__value--small">${next ? esc(next.name) : '—'}</strong>
          <span class="stat__hint">${next ? `${daysLabel(next.daysLeft)} · ${formatDate(next.nextBillingDate)}` : 'Додайте першу підписку'}</span>
        </article>
      </div>
      ${bars ? `<ul class="bars" aria-label="Витрати за категоріями (на місяць)">${bars}</ul>` : ''}
      <p class="rates muted">${ratesNote}. Підсумки перераховано в гривні.</p>
    </section>`
}

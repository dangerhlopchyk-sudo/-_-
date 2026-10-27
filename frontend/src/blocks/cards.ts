import './cards.css'
import { CATEGORY_LABELS, PERIOD_LABELS, PERIOD_SHORT, daysLabel, esc, formatDate, money, urgencyOf } from '../format'
import { Currency, BillingPeriod } from '../types'
import type { BlockRenderer, CardsBlock, Subscription, Urgency } from '../types'
import { assertNever } from '../utils'
import { renderLogo } from './logo'

// Вичерпний switch: якщо додати новий рівень Urgency, TypeScript підкаже, що його не оброблено
function urgencyText(urgency: Urgency): string {
  switch (urgency) {
    case 'critical':
      return 'Терміново'
    case 'warning':
      return 'Скоро'
    case 'notice':
      return 'Незабаром'
    case 'calm':
      return 'Є час'
    default:
      return assertNever(urgency)
  }
}

function renderCard(sub: Subscription): string {
  const urgency = urgencyOf(sub.daysLeft)
  const showConverted = sub.currency !== Currency.UAH || sub.period !== BillingPeriod.Monthly
  return `
    <article class="card card--${urgency}" data-id="${esc(sub.id)}">
      <header class="card__head">
        ${renderLogo(sub.name)}
        <div class="card__title">
          <h3 class="card__name">${esc(sub.name)}</h3>
          <span class="muted">${PERIOD_LABELS[sub.period]}</span>
        </div>
        <span class="chip">${esc(CATEGORY_LABELS[sub.category])}</span>
      </header>
      <p class="card__price">${money(sub.cost, sub.currency)}<small> / ${PERIOD_SHORT[sub.period]}</small></p>
      ${showConverted ? `<p class="card__converted muted">≈ ${money(sub.monthlyUah, Currency.UAH)} на місяць</p>` : ''}
      <p class="card__due card__due--${urgency}">
        <span class="card__due-tag">${urgencyText(urgency)}</span>
        <strong>${daysLabel(sub.daysLeft)}</strong>
        <span>${formatDate(sub.nextBillingDate)}</span>
      </p>
      <footer class="card__foot">
        <button class="btn btn--small btn--ghost" type="button" data-action="edit" data-id="${esc(sub.id)}">Редагувати</button>
        <button class="btn btn--small btn--danger" type="button" data-action="delete" data-id="${esc(sub.id)}">Видалити</button>
      </footer>
    </article>`
}

export const renderCards: BlockRenderer<CardsBlock> = ({ items, hasFilters, anchor }) => {
  if (items.length === 0) {
    return `
      <section class="empty" ${anchor ? `id="${esc(anchor)}"` : ''}>
        <p class="empty__title">${hasFilters ? 'За обраними фільтрами нічого не знайдено' : 'Підписок поки немає'}</p>
        ${
          hasFilters
            ? '<button class="btn btn--ghost" type="button" data-action="reset-filters">Скинути фільтри</button>'
            : '<button class="btn btn--primary" type="button" data-action="add">+ Додати першу підписку</button>'
        }
      </section>`
  }
  return `<section class="cards" ${anchor ? `id="${esc(anchor)}"` : ''}>${items.map(renderCard).join('')}</section>`
}

import './form.css'
import { CATEGORY_LABELS, CURRENCY_LIST, PERIOD_LABELS, esc } from '../format'
import { BillingPeriod, Category, Currency } from '../types'
import type { BlockRenderer, FormBlock, Preset } from '../types'
import { renderLogo } from './logo'

function localToday(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const optionList = (labels: Record<string, string>, selected: string): string =>
  Object.entries(labels)
    .map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`)
    .join('')

const presetButton = (preset: Preset): string => `
  <button class="preset" type="button" data-action="pick-preset" data-preset="${esc(preset.name)}">
    ${renderLogo(preset.name)}
    <span class="preset__name">${esc(preset.name)}</span>
  </button>`

export const renderForm: BlockRenderer<FormBlock> = ({ editing, title, presets }) => {
  const sub = editing
  const currencies = Object.fromEntries(CURRENCY_LIST.map((c) => [c, c]))
  return `
    <div class="modal" data-action="close-form">
      <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <h2 id="form-title" class="section-title">${esc(title)}</h2>
        ${
          sub
            ? ''
            : `<p class="muted modal__lead">Оберіть готовий сервіс або додайте власну підписку.</p>
               <div class="presets">
                 ${presets.map(presetButton).join('')}
                 <button class="preset preset--custom" type="button" data-action="pick-custom">
                   <span class="logo logo--plus" aria-hidden="true">+</span>
                   <span class="preset__name">Своя підписка</span>
                 </button>
               </div>`
        }
        <form id="sub-form" data-id="${sub ? esc(sub.id) : ''}" novalidate>
          <label class="field"><span>Назва сервісу</span>
            <input name="name" type="text" required maxlength="80" placeholder="Наприклад, Spotify"
              value="${sub ? esc(sub.name) : ''}" />
          </label>
          <div class="form-row">
            <label class="field"><span>Вартість</span>
              <input name="cost" type="number" inputmode="decimal" min="0" step="0.01" required
                placeholder="0.00" value="${sub ? sub.cost : ''}" />
            </label>
            <label class="field"><span>Валюта</span>
              <select name="currency">${optionList(currencies, sub?.currency ?? Currency.UAH)}</select>
            </label>
          </div>
          <div class="form-row">
            <label class="field"><span>Категорія</span>
              <select name="category">${optionList(CATEGORY_LABELS, sub?.category ?? Category.Streaming)}</select>
            </label>
            <label class="field"><span>Періодичність</span>
              <select name="period">${optionList(PERIOD_LABELS, sub?.period ?? BillingPeriod.Monthly)}</select>
            </label>
          </div>
          <label class="field"><span>Дата наступного списання</span>
            <input name="nextBillingDate" type="date" required value="${sub ? sub.nextBillingDate : localToday()}" />
          </label>
          <p class="form-error" id="form-error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn btn--ghost" type="button" data-action="close-form">Скасувати</button>
            <button class="btn btn--primary" type="submit">${sub ? 'Зберегти зміни' : 'Додати підписку'}</button>
          </div>
        </form>
      </div>
    </div>`
}

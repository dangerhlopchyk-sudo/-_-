import './toolbar.css'
import { CATEGORY_LABELS, PERIOD_LABELS, esc } from '../format'
import type { BlockRenderer, SortKey, ToolbarBlock } from '../types'

const SORT_LABELS: Record<SortKey, string> = {
  nextBillingDate: 'За датою списання',
  monthlyUah: 'За вартістю на місяць',
  name: 'За назвою',
}

// Generic-функція: працює з будь-яким словником «значення → підпис»
const options = <K extends string>(labels: Record<K, string>, selected: string): string =>
  (Object.keys(labels) as K[])
    .map((key) => `<option value="${key}"${key === selected ? ' selected' : ''}>${esc(labels[key])}</option>`)
    .join('')

export const renderToolbar: BlockRenderer<ToolbarBlock> = ({ filters, total, shown, title, anchor }) => `
  <section class="toolbar" ${anchor ? `id="${esc(anchor)}"` : ''}>
    <div class="toolbar__head">
      <div>
        <h2 class="section-title">${esc(title)}</h2>
        <p class="muted">Показано ${shown} з ${total}</p>
      </div>
      <button class="btn btn--primary" type="button" data-action="add">+ Додати підписку</button>
    </div>
    <div class="toolbar__filters">
      <label class="field"><span>Категорія</span>
        <select data-filter="category">
          <option value="all"${filters.category === 'all' ? ' selected' : ''}>Усі категорії</option>
          ${options(CATEGORY_LABELS, filters.category)}
        </select>
      </label>
      <label class="field"><span>Періодичність</span>
        <select data-filter="period">
          <option value="all"${filters.period === 'all' ? ' selected' : ''}>Будь-яка</option>
          ${options(PERIOD_LABELS, filters.period)}
        </select>
      </label>
      <label class="field"><span>Сортування</span>
        <select data-filter="sort">${options(SORT_LABELS, filters.sort)}</select>
      </label>
      <button class="btn btn--ghost toolbar__order" type="button" data-action="toggle-order"
        title="Змінити напрямок сортування">${filters.order === 'asc' ? '↑ За зростанням' : '↓ За спаданням'}</button>
    </div>
  </section>`

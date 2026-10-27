import { esc, initialOf, logoUrl } from '../format'
import { findPreset } from '../presets'
import { cx, hueOf } from '../utils'

// Логотип сервісу: готове зображення за доменом, а якщо воно не завантажилось — літерний аватар.
export function renderLogo(name: string): string {
  const preset = findPreset(name)
  const image = preset
    ? `<img class="logo__img" src="${esc(logoUrl(preset.domain))}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : ''
  return `
    <span class="${cx('logo', preset && 'logo--brand')}" style="--hue:${hueOf(name)}" aria-hidden="true">
      <span class="logo__letter">${esc(initialOf(name))}</span>${image}
    </span>`
}

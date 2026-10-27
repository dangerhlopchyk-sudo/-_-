import { displayName, esc } from '../format'
import type { User } from '../types'

export function renderHeader(user: User | null): string {
  return `
    <header class="header">
      <div class="header__inner container">
        <a class="header__brand" href="/">
          <span>Керування Підписками</span>
        </a>
        ${
          user
            ? `<div class="header__user">
                 <span class="header__name">${esc(displayName(user))}</span>
                 <button class="btn btn--small btn--ghost" type="button" data-action="logout">Вийти</button>
               </div>`
            : ''
        }
      </div>
    </header>`
}

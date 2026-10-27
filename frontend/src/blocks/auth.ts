import './auth.css'
import { esc } from '../format'
import { PASSWORD_RULES } from '../validators'
import type { AuthBlock, BlockRenderer } from '../types'

const rulesList = (): string =>
  PASSWORD_RULES.map(
    (rule) =>
      `<li data-rule="${rule.id}"${rule.required ? '' : ' class="is-optional"'}>${esc(rule.label)}${
        rule.required ? '' : ' <small>(бажано)</small>'
      }</li>`,
  ).join('')

export const renderAuth: BlockRenderer<AuthBlock> = (block) => {
  const isRegister = block.mode === 'register'
  return `
    <section class="auth" ${block.anchor ? `id="${esc(block.anchor)}"` : ''}>
      <div class="auth__aside">
        <span class="badge">${esc(block.badge ?? 'Керування Підписками')}</span>
        <h1 class="auth__headline">Усі підписки<br />в одному місці</h1>
        <ul class="auth__points">
          <li>Скільки ви витрачаєте на місяць і на рік</li>
          <li>Нагадування, коли наближається списання</li>
          <li>Spotify, Netflix, ChatGPT та інші — в один клік</li>
        </ul>
      </div>
      <div class="auth__card">
        <h2 class="auth__title">${esc(block.title)}</h2>
        ${block.subtitle ? `<p class="muted">${esc(block.subtitle)}</p>` : ''}
        <form id="auth-form" data-mode="${block.mode}" novalidate>
          ${
            isRegister
              ? `<label class="field"><span>Імʼя</span>
                   <input name="name" type="text" autocomplete="name" maxlength="60" placeholder="Як до вас звертатись" />
                 </label>`
              : ''
          }
          <label class="field"><span>Email</span>
            <input name="email" type="email" autocomplete="email" maxlength="254" required placeholder="you@example.com" />
          </label>
          <label class="field"><span>Пароль</span>
            <input name="password" type="password" data-secret required maxlength="64"
              autocomplete="${isRegister ? 'new-password' : 'current-password'}"
              placeholder="${isRegister ? 'Створіть надійний пароль' : 'Ваш пароль'}" />
          </label>
          ${
            isRegister
              ? `<div class="meter" id="password-meter" data-strength="empty"><span class="meter__fill"></span></div>
                 <p class="meter__label muted" id="password-meter-label">Введіть пароль</p>
                 <p class="muted rules__note">Обовʼязково: від 8 символів, цифра та спецсимвол.</p>
                 <ul class="rules" id="password-rules">${rulesList()}</ul>
                 <label class="field"><span>Повторіть пароль</span>
                   <input name="passwordConfirm" type="password" data-secret required maxlength="64" autocomplete="new-password" />
                 </label>`
              : ''
          }
          <label class="check"><input type="checkbox" data-toggle="password" /> Показати пароль</label>
          <p class="form-error" id="auth-error" role="alert" hidden></p>
          <button class="btn btn--primary btn--block" type="submit">${isRegister ? 'Створити акаунт' : 'Увійти'}</button>
        </form>
        <p class="auth__switch muted">
          ${isRegister ? 'Уже є акаунт?' : 'Немає акаунта?'}
          <button class="link" type="button" data-action="switch-auth">${isRegister ? 'Увійти' : 'Зареєструватися'}</button>
        </p>
      </div>
    </section>`
}

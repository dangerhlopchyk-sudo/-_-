import type { Access, CollectionConfig } from 'payload'
import { categoryOptions, currencyOptions, periodOptions } from '../lib/constants'
import { roleOf } from './Users'

// Користувач бачить і змінює лише власні підписки, адміністратор — усі
const ownerOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (roleOf(req.user) === 'admin') return true
  return { owner: { equals: req.user.id } }
}

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: 'Підписка', plural: 'Підписки' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'cost', 'currency', 'period', 'nextBillingDate', 'owner'],
  },
  access: {
    read: ownerOrAdmin,
    create: ({ req }) => Boolean(req.user),
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation, req }) => {
        if (data && operation === 'create' && !data.owner && req.user) data.owner = req.user.id
        return data
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Назва сервісу', type: 'text', required: true, maxLength: 80 },
    { name: 'cost', label: 'Вартість', type: 'number', required: true, min: 0 },
    { name: 'currency', label: 'Валюта', type: 'select', required: true, defaultValue: 'UAH', options: currencyOptions },
    { name: 'category', label: 'Категорія', type: 'select', required: true, defaultValue: 'other', options: categoryOptions },
    { name: 'period', label: 'Періодичність списання', type: 'select', required: true, defaultValue: 'monthly', options: periodOptions },
    {
      name: 'nextBillingDate',
      label: 'Дата наступного списання',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
    },
    {
      name: 'owner',
      label: 'Власник',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar' },
    },
  ],
}

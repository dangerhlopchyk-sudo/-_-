import type { Access, CollectionConfig } from 'payload'

export const roleOf = (user: unknown): string | undefined => (user as { role?: string } | null | undefined)?.role

const isAdmin: Access = ({ req }) => roleOf(req.user) === 'admin'

const selfOrAdmin: Access = ({ req }) => {
  if (!req.user) return false
  if (roleOf(req.user) === 'admin') return true
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Користувач', plural: 'Користувачі' },
  auth: { tokenExpiration: 60 * 60 * 24 * 7 },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  access: {
    admin: isAdmin,
    create: () => true,
    read: selfOrAdmin,
    update: selfOrAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data
        if (roleOf(req.user) === 'admin') return data
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users' })
          data.role = totalDocs === 0 ? 'admin' : 'user'
        } else {
          data.role = originalDoc?.role ?? 'user'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', label: 'Імʼя', type: 'text' },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      defaultValue: 'user',
      options: [
        { label: 'Адміністратор', value: 'admin' },
        { label: 'Користувач', value: 'user' },
      ],
    },
  ],
}

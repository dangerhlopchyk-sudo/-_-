import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { uk } from '@payloadcms/translations/languages/uk'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'

import { Subscriptions } from './collections/Subscriptions'
import { Users } from './collections/Users'
import { endpoints } from './endpoints'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)


const origins = [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5173', 'http://localhost:3000']

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Керування Підписками' },
  },
  collections: [Users, Subscriptions],
  endpoints,
  editor: lexicalEditor(),
  i18n: { supportedLanguages: { uk }, fallbackLanguage: 'uk' },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL || '' } }),
  cors: { origins, headers: ['Authorization', 'Content-Type'] },
  csrf: origins,
})

import { defineConfig } from 'drizzle-kit';
import { loadEnv } from 'vite';

const env = loadEnv('', process.cwd(), '');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: env.TURSO_DATABASE_URL ?? process.env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
  },
});

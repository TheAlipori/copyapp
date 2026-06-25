import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

// process.env is read at runtime (not replaced by Vite at build time),
// which avoids module-load crashes in Vercel when env vars are configured
// after the first build.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? import.meta.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN ?? import.meta.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

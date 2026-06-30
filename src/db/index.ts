import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function getDb() {
  const url = process.env.TURSO_DATABASE_URL ?? import.meta.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN ?? import.meta.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL no definido');
  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof getDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    if (!_db) _db = getDb();
    return (_db as any)[prop];
  },
});

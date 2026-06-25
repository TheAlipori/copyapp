// Migración: agrega cliente_nombre y cliente_rfc a la tabla ventas
// Uso: node --env-file=.env scripts/migrate-cliente.js

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log('Conectando a Turso...');

  // ALTER TABLE ignora el error si la columna ya existe (lo hacemos manual)
  const columnas = await client.execute(`PRAGMA table_info(ventas)`);
  const nombres = columnas.rows.map((r) => r[1]);

  if (!nombres.includes('cliente_nombre')) {
    await client.execute(`ALTER TABLE ventas ADD COLUMN cliente_nombre TEXT NOT NULL DEFAULT 'Público General'`);
    console.log('✓ Columna cliente_nombre agregada');
  } else {
    console.log('— cliente_nombre ya existe');
  }

  if (!nombres.includes('cliente_rfc')) {
    await client.execute(`ALTER TABLE ventas ADD COLUMN cliente_rfc TEXT NOT NULL DEFAULT 'XAXX010101000'`);
    console.log('✓ Columna cliente_rfc agregada');
  } else {
    console.log('— cliente_rfc ya existe');
  }

  console.log('Migración completada.');
  process.exit(0);
}

run().catch((e) => { console.error('Error:', e.message); process.exit(1); });

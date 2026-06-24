/**
 * Crea el usuario admin inicial y los precios base.
 * Uso: npx tsx scripts/seed.ts
 */
import { loadEnv } from 'vite';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { hash } from 'bcryptjs';
import * as schema from '../src/db/schema';

Object.assign(process.env, loadEnv('', process.cwd(), ''));

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client, { schema });

async function seed() {
  // Usuario admin
  const passwordHash = await hash('admin123', 10);
  await db.insert(schema.usuarios).values({
    username: 'admin',
    password_hash: passwordHash,
    role: 'admin',
  }).onConflictDoNothing();

  // Precios — solo inserta si la tabla está vacía
  const existingPrecios = await db.select().from(schema.config_precios).limit(1);
  if (existingPrecios.length > 0) {
    console.log('Precios ya existentes, omitiendo...');
    process.exit(0);
  }
  await db.insert(schema.config_precios).values([
    { tipo: 'byn_carta',       nombre: 'B/N Carta 1-49',              desde: 1,   hasta: 49,   precio: 1.00, doble_cara: 0 },
    { tipo: 'byn_carta',       nombre: 'B/N Carta 50-99',             desde: 50,  hasta: 99,   precio: 0.70, doble_cara: 0 },
    { tipo: 'byn_carta',       nombre: 'B/N Carta 100+ simple',       desde: 100, hasta: null, precio: 0.50, doble_cara: 0 },
    { tipo: 'byn_carta',       nombre: 'B/N Carta 100+ doble cara',   desde: 100, hasta: null, precio: 0.42, doble_cara: 1 },
    { tipo: 'byn_oficio',      nombre: 'B/N Oficio 1-99',             desde: 1,   hasta: 99,   precio: 1.00, doble_cara: 0 },
    { tipo: 'byn_oficio',      nombre: 'B/N Oficio 100+',             desde: 100, hasta: null, precio: 0.80, doble_cara: 0 },
    { tipo: 'byn_media_carta', nombre: 'B/N Media Carta 1-99',        desde: 1,   hasta: 99,   precio: 0.50, doble_cara: 0 },
    { tipo: 'byn_media_carta', nombre: 'B/N Media Carta 100-199',     desde: 100, hasta: 199,  precio: 0.35, doble_cara: 0 },
    { tipo: 'byn_media_carta', nombre: 'B/N Media Carta 200+ simple', desde: 200, hasta: null, precio: 0.25, doble_cara: 0 },
    { tipo: 'byn_media_carta', nombre: 'B/N Media Carta 200+ doble',  desde: 200, hasta: null, precio: 0.21, doble_cara: 1 },
    // Papeles especiales para Color Carta
    { tipo: 'papel_especial_carta',    nombre: 'Couché',          desde: null, hasta: null, precio: 1.50,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Opalina delgada', desde: null, hasta: null, precio: 2.00,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Opalina gruesa',  desde: null, hasta: null, precio: 3.00,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Adhesivo',        desde: null, hasta: null, precio: 4.00,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Carolina',        desde: null, hasta: null, precio: 6.00,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Fotográfico',     desde: null, hasta: null, precio: 7.00,  doble_cara: 0 },
    { tipo: 'papel_especial_carta',    nombre: 'Vinil',           desde: null, hasta: null, precio: 15.00, doble_cara: 0 },
    // Papeles especiales para Color Tabloide
    { tipo: 'papel_especial_tabloide', nombre: 'Couché',          desde: null, hasta: null, precio: 3.00,  doble_cara: 0 },
    { tipo: 'papel_especial_tabloide', nombre: 'Carolina',        desde: null, hasta: null, precio: 9.00,  doble_cara: 0 },
    { tipo: 'papel_especial_tabloide', nombre: 'Sulfatado',       desde: null, hasta: null, precio: 7.00,  doble_cara: 0 },
  ]);

  console.log('Seed completado.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });

import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { config_precios } from '../../../../db/schema';
import { verifySession } from '../../../../lib/session';
import { asc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session || session.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const lista = await db.select().from(config_precios).orderBy(asc(config_precios.tipo), asc(config_precios.desde));
  return Response.json(lista);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session || session.role !== 'admin') return new Response('Forbidden', { status: 403 });

  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }

  if (!body.tipo || !body.nombre || body.precio == null) {
    return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const [nuevo] = await db.insert(config_precios).values({
    tipo: body.tipo,
    nombre: body.nombre,
    desde: body.desde ?? null,
    hasta: body.hasta ?? null,
    precio: parseFloat(body.precio),
    doble_cara: body.doble_cara ? 1 : 0,
  }).returning();

  return Response.json(nuevo, { status: 201 });
};

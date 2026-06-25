import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { deudas } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const lista = await db.select().from(deudas).orderBy(desc(deudas.created_at));
  return Response.json(lista);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { cliente?: string; concepto?: string; monto?: number };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }

  const cliente = body.cliente?.trim();
  const monto = body.monto;

  if (!cliente) return Response.json({ error: 'El cliente es requerido' }, { status: 400 });
  if (!monto || monto <= 0) return Response.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 });

  const [nueva] = await db.insert(deudas).values({
    cliente,
    concepto: body.concepto?.trim() || 'Sin especificar',
    monto,
  }).returning();

  return Response.json(nueva, { status: 201 });
};

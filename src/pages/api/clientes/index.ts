import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { clientes } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { asc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const lista = await db.select().from(clientes).orderBy(asc(clientes.nombre));
  return Response.json(lista);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { nombre?: string; rfc?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const nombre = body.nombre?.trim();
  if (!nombre) return Response.json({ error: 'El nombre es requerido' }, { status: 400 });

  const rfc = body.rfc?.trim().toUpperCase() || 'XAXX010101000';

  const [nuevo] = await db.insert(clientes).values({ nombre, rfc }).returning();
  return Response.json(nuevo, { status: 201 });
};

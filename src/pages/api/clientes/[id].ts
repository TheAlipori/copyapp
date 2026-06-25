import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { clientes } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { eq } from 'drizzle-orm';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = parseInt(params.id ?? '');
  if (!id) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const deleted = await db.delete(clientes).where(eq(clientes.id, id)).returning({ id: clientes.id });
  if (!deleted.length) return Response.json({ error: 'No encontrado' }, { status: 404 });

  return Response.json({ ok: true });
};

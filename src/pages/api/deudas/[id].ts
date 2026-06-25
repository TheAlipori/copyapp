import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { deudas } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { eq } from 'drizzle-orm';

export const PATCH: APIRoute = async ({ params, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = parseInt(params.id ?? '');
  if (!id) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const [updated] = await db
    .update(deudas)
    .set({ pagado: 1 })
    .where(eq(deudas.id, id))
    .returning();

  if (!updated) return Response.json({ error: 'No encontrado' }, { status: 404 });
  return Response.json(updated);
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = parseInt(params.id ?? '');
  if (!id) return Response.json({ error: 'ID inválido' }, { status: 400 });

  const deleted = await db.delete(deudas).where(eq(deudas.id, id)).returning({ id: deudas.id });
  if (!deleted.length) return Response.json({ error: 'No encontrado' }, { status: 404 });
  return Response.json({ ok: true });
};

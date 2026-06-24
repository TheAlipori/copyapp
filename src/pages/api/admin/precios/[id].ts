import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { config_precios } from '../../../../db/schema';
import { verifySession } from '../../../../lib/session';

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session || session.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const id = Number(params.id);
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }

  const updates: Record<string, any> = {};
  if (body.nombre  != null) updates.nombre     = body.nombre;
  if (body.precio  != null) updates.precio     = parseFloat(body.precio);
  if (body.desde   != null) updates.desde      = body.desde;
  if (body.hasta   != null) updates.hasta      = body.hasta;
  if (body.doble_cara != null) updates.doble_cara = body.doble_cara ? 1 : 0;
  updates.updated_at = new Date().toISOString();

  const [updated] = await db.update(config_precios).set(updates).where(eq(config_precios.id, id)).returning();
  if (!updated) return Response.json({ error: 'No encontrado' }, { status: 404 });

  return Response.json(updated);
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = await verifySession(cookies);
  if (!session || session.role !== 'admin') return new Response('Forbidden', { status: 403 });

  const id = Number(params.id);
  await db.delete(config_precios).where(eq(config_precios.id, id));
  return new Response(null, { status: 204 });
};

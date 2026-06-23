import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { pendientes } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { eq } from 'drizzle-orm';

export const PATCH: APIRoute = async ({ request, cookies, params }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = parseInt(params.id!);
  if (isNaN(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) updates.status = body.status;
  if (body.estado_pago !== undefined) updates.estado_pago = body.estado_pago;
  if (body.hecho_por !== undefined) updates.hecho_por = body.hecho_por;
  if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp;
  if ('nombre' in body) updates.nombre = body.nombre;
  if ('instrucciones_adicionales' in body) updates.instrucciones_adicionales = body.instrucciones_adicionales;
  if ('fecha_entrega' in body) updates.fecha_entrega = body.fecha_entrega;
  if ('tipo_trabajo' in body) updates.tipo_trabajo = body.tipo_trabajo;
  if ('juegos' in body) updates.juegos = body.juegos;
  if ('copias_total' in body) updates.copias_total = body.copias_total;
  if ('monto' in body) updates.monto = body.monto;
  if ('monto_anticipo' in body) updates.monto_anticipo = body.monto_anticipo;
  if ('metodo_pago_pendiente' in body) updates.metodo_pago_pendiente = body.metodo_pago_pendiente;
  if ('factura' in body) updates.factura = body.factura ? 1 : 0;

  const [updated] = await db
    .update(pendientes)
    .set(updates)
    .where(eq(pendientes.id, id))
    .returning();

  if (!updated) return Response.json({ error: 'No encontrado' }, { status: 404 });
  return Response.json(updated);
};

export const DELETE: APIRoute = async ({ cookies, params }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const id = parseInt(params.id!);
  if (isNaN(id)) return Response.json({ error: 'ID inválido' }, { status: 400 });

  await db.delete(pendientes).where(eq(pendientes.id, id));
  return new Response(null, { status: 204 });
};

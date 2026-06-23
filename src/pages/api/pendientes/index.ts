import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { pendientes } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const lista = await db.select().from(pendientes).orderBy(desc(pendientes.created_at));
  return Response.json(lista);
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!body.whatsapp?.trim()) {
    return Response.json({ error: 'WhatsApp es requerido' }, { status: 400 });
  }

  const last = await db
    .select({ folio: pendientes.folio })
    .from(pendientes)
    .orderBy(desc(pendientes.id))
    .limit(1);

  let nextNum = 1;
  if (last.length > 0) {
    const match = last[0].folio.match(/P-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const folio = `P-${String(nextNum).padStart(5, '0')}`;

  const [nuevo] = await db
    .insert(pendientes)
    .values({
      folio,
      whatsapp: body.whatsapp.trim(),
      nombre: body.nombre?.trim() || null,
      instrucciones_adicionales: body.instrucciones_adicionales?.trim() || null,
      fecha_entrega: body.fecha_entrega || null,
      tipo_trabajo: body.tipo_trabajo || null,
      juegos: body.juegos ? parseInt(body.juegos) : null,
      copias_total: body.copias_total ? parseInt(body.copias_total) : null,
      monto: body.monto ? parseFloat(body.monto) : null,
      monto_anticipo: body.monto_anticipo ? parseFloat(body.monto_anticipo) : null,
      metodo_pago_pendiente: body.metodo_pago_pendiente || null,
      factura: body.factura ? 1 : 0,
      tomado_por: session.username,
    })
    .returning();

  return Response.json(nuevo, { status: 201 });
};

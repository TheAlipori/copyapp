import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { ventas, venta_items } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { desc } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { items: any[]; metodo_pago: string; cliente_nombre?: string; cliente_rfc?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { items, metodo_pago, cliente_nombre, cliente_rfc } = body;

  if (!items?.length || !metodo_pago) {
    return Response.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Generar folio V-NNNNN
  const last = await db
    .select({ folio: ventas.folio })
    .from(ventas)
    .orderBy(desc(ventas.id))
    .limit(1);

  let nextNum = 1;
  if (last.length > 0) {
    const match = last[0].folio.match(/V-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const folio = `V-${String(nextNum).padStart(5, '0')}`;

  const total: number = items.reduce((s: number, i: any) => s + i.subtotal, 0);

  try {
    await db.transaction(async (tx) => {
      const [venta] = await tx
        .insert(ventas)
        .values({
          folio,
          total,
          metodo_pago,
          cobrado_por: session.username,
          cliente_nombre: cliente_nombre?.trim() || 'Público General',
          cliente_rfc: cliente_rfc?.trim().toUpperCase() || 'XAXX010101000',
        })
        .returning({ id: ventas.id });

      await tx.insert(venta_items).values(
        items.map((item: any) => ({
          venta_id: venta.id,
          tipo: item.tipo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unit: item.precio_unit,
          subtotal: item.subtotal,
          hojas: item.hojas ?? null,
          doble_cara: item.doble_cara ?? 0,
          papel_especial: item.papel_especial ?? null,
        })),
      );
    });
  } catch (e) {
    return Response.json({ error: 'Error al guardar la venta' }, { status: 500 });
  }

  return Response.json({ folio, total });
};

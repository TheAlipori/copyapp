import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { ventas, venta_items } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { desc } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies, url }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const fecha = url.searchParams.get('fecha'); // YYYY-MM-DD

  const lista = await db.select().from(ventas).orderBy(desc(ventas.created_at)).limit(500);
  const filtradas = fecha ? lista.filter((v) => v.created_at.startsWith(fecha)) : lista;

  const todosItems = await db.select().from(venta_items);

  const itemsPorVenta: Record<number, typeof todosItems> = {};
  for (const item of todosItems) {
    if (!itemsPorVenta[item.venta_id]) itemsPorVenta[item.venta_id] = [];
    itemsPorVenta[item.venta_id].push(item);
  }

  const resultado = filtradas.map((v) => ({ ...v, items: itemsPorVenta[v.id] ?? [] }));

  return Response.json(resultado);
};

import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { productos } from '../../../db/schema';
import { verifySession } from '../../../lib/session';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const lista = await db.select().from(productos).where(eq(productos.activo, 1));
  return Response.json(lista);
};

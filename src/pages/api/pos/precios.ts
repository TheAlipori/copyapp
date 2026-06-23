import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { config_precios } from '../../../db/schema';
import { verifySession } from '../../../lib/session';

export const GET: APIRoute = async ({ cookies }) => {
  const session = await verifySession(cookies);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const precios = await db.select().from(config_precios);
  return Response.json(precios);
};

import { defineMiddleware } from 'astro:middleware';
import { verifySession } from './lib/session';

const PUBLIC_PATHS = ['/login', '/logout'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Rutas públicas: no requieren sesión
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return next();
  }

  const session = await verifySession(context.cookies);

  if (!session) {
    return context.redirect('/login');
  }

  // Proteger rutas admin
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return context.redirect('/pos');
  }

  // Pasar datos de sesión a todas las páginas
  context.locals.user = session;

  return next();
});

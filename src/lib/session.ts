import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface SessionUser {
  id: number;
  username: string;
  role: 'admin' | 'empleado';
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? import.meta.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET no definido');
  return secret;
}

// Firma simple HMAC-SHA256 usando Web Crypto API (disponible en Vercel Edge/Node)
async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Buffer.from(sig).toString('base64url');
}

async function verify(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await sign(payload, secret);
  return expected === signature;
}

export async function createSession(user: SessionUser, cookies: AstroCookies): Promise<void> {
  const payload = JSON.stringify({ id: user.id, username: user.username, role: user.role });
  const encoded = Buffer.from(payload).toString('base64url');
  const secret = getSecret();
  const sig = await sign(encoded, secret);
  const token = `${encoded}.${sig}`;

  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function verifySession(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 1) return null;
  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  try {
    const secret = getSecret();
    const valid = await verify(encoded, sig, secret);
    if (!valid) return null;

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    return payload as SessionUser;
  } catch {
    return null;
  }
}

export function destroySession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

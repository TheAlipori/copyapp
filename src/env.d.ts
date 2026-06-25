/// <reference types="astro/client" />

import type { SessionUser } from './lib/session';

declare namespace App {
  interface Locals {
    user: SessionUser;
  }
}

interface ImportMetaEnv {
  readonly TURSO_DATABASE_URL: string;
  readonly TURSO_AUTH_TOKEN: string;
  readonly SESSION_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

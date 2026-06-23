/// <reference types="astro/client" />

import type { SessionUser } from './lib/session';

declare namespace App {
  interface Locals {
    user: SessionUser;
  }
}

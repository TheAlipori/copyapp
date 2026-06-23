## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

e · MDCopyCopymax — Sales System

What this is

Web POS for a copy/print shop. Three areas: POS (sales), Pending jobs (jobs that arrive via WhatsApp, with statuses), and Reminders/Debts. Full spec lives in PLAN.md.

Stack


Astro in SSR mode (output: 'server') with the official Vercel adapter.
Tailwind CSS v4 via the Vite plugin (@tailwindcss/vite). Do NOT use @astrojs/tailwind (deprecated for v4).
Database: Turso (libSQL / SQLite in the cloud), accessed with Drizzle ORM. Do NOT use @astrojs/db / astro:db (deprecated in Astro v6.5).
Interactive islands in React or Svelte, only where needed (POS ticket, pending-jobs board).
Deployed to Vercel; Turso credentials in environment variables.


Decisions & constraints (important)


No inventory tracking. Do not add stock counting unless explicitly requested.
Prices and paper types are editable from the database (config_precios table), never hardcoded.
Pending-jobs board uses polling every 3-5 s, NOT Supabase real-time.
Login required (user/password): the app is used over the internet (owner from home + employees at the shop).
Pending-job statuses: tomado -> en_curso -> finalizado. Each stores: client, instructions, due date, paid (yes/no), taken_by, done_by, amount.


Print pricing logic

Flat price per bracket: every sheet is charged at the price of the bracket the total quantity falls into. Prices in MXN.


B/W Letter (Carta): 1-49 = $1.00 - 50-99 = $0.70 - 100+ single-sided = $0.50 - 100+ double-sided = $0.42
B/W Legal (Oficio): 1-99 = $1.00 - 100+ = $0.80
Color: per-sheet price chosen by the operator, from $2 to $6 depending on color coverage.
Special paper: surcharge per physical sheet (a double-sided sheet = 1 paper). Total = print + paper. Thick opaline (opalina gruesa) = +$3 (others TBC).
Products (pens, folders, USB, loose paper): fixed price from the productos table.
Design and variable-price services: amount typed in manually at checkout.


Tables

ventas, venta_items, pendientes, recordatorios, deudas, productos, config_precios. Column-level detail in PLAN.md. Table and column names are kept in Spanish.

Conventions


TypeScript throughout.
User-facing UI language: Spanish.
Keep this file short; detail goes in PLAN.md.


Development

When starting the dev server, use background mode:

astro dev --background

Manage the background server with astro dev stop, astro dev status, and astro dev logs.

Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:


Adding pages, dynamic routes, or middleware
Working with Astro components
Using React, Vue, Svelte, or other framework components
Adding or managing content
Adding styles or using Tailwind
Supporting multiple languages

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

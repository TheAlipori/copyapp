# MDCopyCopymax — Plan de Implementación

## Resumen del sistema

Web POS para copistería/papelería. Tres módulos:
1. **POS / Ventas** — punto de venta en caja
2. **Trabajos pendientes** — pedidos que llegan por WhatsApp con flujo de estados
3. **Recordatorios y Deudas** — seguimiento de clientes con saldo pendiente

---

## Stack definitivo

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 7 en modo SSR (`output: 'server'`) |
| Adaptador | `@astrojs/vercel` |
| Estilos | Tailwind CSS v4 vía `@tailwindcss/vite` |
| Base de datos | Turso (libSQL / SQLite en la nube) |
| ORM | Drizzle ORM + `drizzle-kit` |
| Islands interactivas | React o Svelte (solo donde sea necesario) |
| Auth | Sesiones con cookies firmadas (usuario/contraseña, sin OAuth) |
| Deploy | Vercel |

---

## Variables de entorno

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
SESSION_SECRET=...          # string largo y aleatorio para firmar cookies
```

---

## Esquema de base de datos

### `usuarios`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
username    TEXT NOT NULL UNIQUE
password_hash TEXT NOT NULL        -- bcrypt
role        TEXT NOT NULL DEFAULT 'empleado'  -- 'admin' | 'empleado'
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### `productos`
Artículos físicos con precio fijo (bolígrafos, folders, USBs, papel suelto, etc.)
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
nombre      TEXT NOT NULL
precio      REAL NOT NULL
activo      INTEGER NOT NULL DEFAULT 1   -- 0 = desactivado
```

### `config_precios`
Configuración de precios de impresión por tramo. Nunca hardcodeados.
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
tipo        TEXT NOT NULL   -- 'byn_carta' | 'byn_oficio' | 'color' | 'papel_especial'
nombre      TEXT NOT NULL   -- etiqueta legible, ej: "B/N Carta 1-49"
desde       INTEGER         -- cantidad mínima del tramo (null para color/manual)
hasta       INTEGER         -- cantidad máxima del tramo (null = sin límite)
precio      REAL NOT NULL   -- precio por hoja
doble_cara  INTEGER DEFAULT 0  -- 1 si aplica solo a doble cara
updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

Filas iniciales:
| tipo | nombre | desde | hasta | precio | doble_cara |
|------|--------|-------|-------|--------|------------|
| byn_carta | B/N Carta 1-49 | 1 | 49 | 1.00 | 0 |
| byn_carta | B/N Carta 50-99 | 50 | 99 | 0.70 | 0 |
| byn_carta | B/N Carta 100+ | 100 | null | 0.50 | 0 |
| byn_carta | B/N Carta 100+ doble cara | 100 | null | 0.42 | 1 |
| byn_oficio | B/N Oficio 1-99 | 1 | 99 | 1.00 | 0 |
| byn_oficio | B/N Oficio 100+ | 100 | null | 0.80 | 0 |
| papel_especial | Opalina gruesa | null | null | 3.00 | 0 |

### `ventas`
Cabecera de cada ticket de venta.
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
folio       TEXT NOT NULL UNIQUE   -- ej: "V-00042"
total       REAL NOT NULL
metodo_pago TEXT NOT NULL          -- 'efectivo' | 'tarjeta' | 'transferencia'
cobrado_por TEXT NOT NULL          -- username del empleado
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### `venta_items`
Líneas de cada ticket.
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
venta_id      INTEGER NOT NULL REFERENCES ventas(id)
tipo          TEXT NOT NULL
  -- 'byn_carta' | 'byn_oficio' | 'color' | 'producto' | 'servicio'
descripcion   TEXT NOT NULL        -- texto legible para el ticket
cantidad      INTEGER NOT NULL DEFAULT 1
precio_unit   REAL NOT NULL
subtotal      REAL NOT NULL        -- cantidad * precio_unit
-- Campos extra para impresión (null si tipo = 'producto' o 'servicio')
hojas         INTEGER              -- número de hojas
doble_cara    INTEGER DEFAULT 0    -- 0/1
papel_especial TEXT                -- null o nombre del papel
```

### `pendientes`
Trabajos que llegan por WhatsApp y se gestionan en el tablero.
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
folio         TEXT NOT NULL UNIQUE   -- ej: "P-00015"
cliente       TEXT NOT NULL
instrucciones TEXT NOT NULL
fecha_entrega TEXT                   -- DATE ISO, puede ser null
monto         REAL
pagado        INTEGER NOT NULL DEFAULT 0   -- 0/1
status        TEXT NOT NULL DEFAULT 'tomado'
  -- 'tomado' | 'en_curso' | 'finalizado'
tomado_por    TEXT                   -- username
hecho_por     TEXT                   -- username
created_at    TEXT NOT NULL DEFAULT (datetime('now'))
updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
```

### `recordatorios`
Avisos internos (sin relación con deudas necesariamente).
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
texto       TEXT NOT NULL
fecha       TEXT                     -- DATE ISO opcional
completado  INTEGER NOT NULL DEFAULT 0
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### `deudas`
Clientes que deben dinero.
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
cliente     TEXT NOT NULL
concepto    TEXT NOT NULL
monto       REAL NOT NULL
pagado      INTEGER NOT NULL DEFAULT 0
fecha       TEXT                     -- DATE ISO, fecha del adeudo
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

---

## Arquitectura de rutas (Astro pages)

```
src/pages/
├── index.astro              → redirect a /pos si hay sesión, si no a /login
├── login.astro              → formulario de login
├── pos.astro                → POS / caja (island React)
├── pendientes.astro         → tablero de trabajos (island React, polling)
├── recordatorios.astro      → lista de recordatorios y deudas
├── admin/
│   ├── productos.astro      → CRUD de productos
│   └── precios.astro        → editar config_precios
└── api/
    ├── auth/
    │   ├── login.ts         → POST: validar credenciales, crear cookie
    │   └── logout.ts        → POST: borrar cookie
    ├── pos/
    │   ├── ticket.ts        → POST: guardar venta + items, devuelve folio
    │   └── precios.ts       → GET: devuelve config_precios vigente
    ├── pendientes/
    │   ├── index.ts         → GET: lista, POST: crear
    │   └── [id].ts          → PATCH: actualizar status/campos, DELETE
    ├── recordatorios/
    │   ├── index.ts         → GET lista, POST crear
    │   └── [id].ts          → PATCH completado, DELETE
    ├── deudas/
    │   ├── index.ts         → GET lista, POST crear
    │   └── [id].ts          → PATCH pagado, DELETE
    └── admin/
        ├── productos/
        │   ├── index.ts     → GET lista, POST crear
        │   └── [id].ts      → PATCH, DELETE
        └── precios/
            ├── index.ts     → GET lista
            └── [id].ts      → PATCH precio
```

---

## Lógica de precios de impresión

```
función calcularPrecioImpresion(tipo, hojas, doble_cara, papel_especial):
  1. Buscar en config_precios el tramo donde hojas >= desde && (hasta is null || hojas <= hasta)
     filtrando por tipo y doble_cara
  2. precio_impresion = hojas * precio_tramo
  3. Si papel_especial != null:
       hojas_fisicas = doble_cara ? ceil(hojas / 2) : hojas
       surcharge = hojas_fisicas * config_precios[papel_especial].precio
       precio_total = precio_impresion + surcharge
  4. return precio_total
```

---

## Auth (sesiones con cookies)

- Login: comparar contraseña con bcrypt hash, crear JWT o token firmado, guardar en cookie `HttpOnly; Secure; SameSite=Strict`
- Middleware Astro (`src/middleware.ts`): verificar cookie en cada request. Si no hay sesión válida y la ruta no es `/login` ni `/api/auth/*`, redirigir a `/login`.
- Roles: `admin` puede acceder a `/admin/*`. `empleado` solo ve POS, pendientes y recordatorios.

---

## Islands interactivas

| Componente | Framework | Motivo |
|-----------|-----------|--------|
| `POSTicket` | React | Estado complejo del carrito, cálculo en tiempo real |
| `PendientesBoard` | React | Polling cada 4s, drag-and-drop de estados |

---

## Orden de implementación

### Fase 1 — Base
- [ ] Drizzle schema + migrate en Turso
- [ ] Archivo `.env.local` con credenciales Turso
- [ ] `src/db/index.ts` — cliente Drizzle
- [ ] `src/middleware.ts` — auth guard
- [ ] Login page + API endpoints auth

### Fase 2 — POS
- [ ] API `GET /api/pos/precios`
- [ ] API `POST /api/pos/ticket`
- [ ] Island `POSTicket` con lógica de carrito y cálculo de precios
- [ ] Página `/pos`

### Fase 3 — Pendientes
- [ ] API CRUD `/api/pendientes/*`
- [ ] Island `PendientesBoard` con polling
- [ ] Página `/pendientes`

### Fase 4 — Recordatorios y Deudas
- [ ] API CRUD `/api/recordatorios/*` y `/api/deudas/*`
- [ ] Página `/recordatorios`

### Fase 5 — Admin
- [ ] API CRUD productos y config_precios
- [ ] Páginas `/admin/productos` y `/admin/precios`

---

## Notas adicionales

- Todos los folios se generan en el servidor con formato `V-NNNNN` / `P-NNNNN`.
- No hay inventario; los productos solo tienen precio.
- El color se cotiza manualmente (operador elige precio por hoja entre $2-$6).
- Diseño y servicios de precio variable: el operador escribe el monto directo.
- UI completamente en español.
- TypeScript en todos los archivos.

import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'empleado'] }).notNull().default('empleado'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const productos = sqliteTable('productos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  precio: real('precio').notNull(),
  activo: integer('activo').notNull().default(1),
});

export const config_precios = sqliteTable('config_precios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(),
  nombre: text('nombre').notNull(),
  desde: integer('desde'),
  hasta: integer('hasta'),
  precio: real('precio').notNull(),
  doble_cara: integer('doble_cara').default(0),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const ventas = sqliteTable('ventas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folio: text('folio').notNull().unique(),
  total: real('total').notNull(),
  metodo_pago: text('metodo_pago', { enum: ['efectivo', 'transferencia'] }).notNull(),
  cobrado_por: text('cobrado_por').notNull(),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const venta_items = sqliteTable('venta_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  venta_id: integer('venta_id').notNull().references(() => ventas.id),
  tipo: text('tipo', { enum: ['byn_carta', 'byn_oficio', 'byn_media_carta', 'color', 'producto', 'servicio'] }).notNull(),
  descripcion: text('descripcion').notNull(),
  cantidad: integer('cantidad').notNull().default(1),
  precio_unit: real('precio_unit').notNull(),
  subtotal: real('subtotal').notNull(),
  hojas: integer('hojas'),
  doble_cara: integer('doble_cara').default(0),
  papel_especial: text('papel_especial'),
});

export const pendientes = sqliteTable('pendientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folio: text('folio').notNull().unique(),
  whatsapp: text('whatsapp').notNull(),
  nombre: text('nombre'),
  instrucciones_adicionales: text('instrucciones_adicionales'),
  fecha_entrega: text('fecha_entrega'),
  tipo_trabajo: text('tipo_trabajo'),
  juegos: integer('juegos'),
  copias_total: integer('copias_total'),
  monto: real('monto'),
  monto_anticipo: real('monto_anticipo'),
  metodo_pago_pendiente: text('metodo_pago_pendiente', { enum: ['efectivo', 'transferencia'] }),
  factura: integer('factura').notNull().default(0),
  estado_pago: text('estado_pago', { enum: ['pendiente', 'anticipo', 'pagado'] }).notNull().default('pendiente'),
  status: text('status', { enum: ['tomado', 'en_curso', 'finalizado'] }).notNull().default('tomado'),
  tomado_por: text('tomado_por'),
  hecho_por: text('hecho_por'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
  updated_at: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const recordatorios = sqliteTable('recordatorios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  texto: text('texto').notNull(),
  fecha: text('fecha'),
  completado: integer('completado').notNull().default(0),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const deudas = sqliteTable('deudas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cliente: text('cliente').notNull(),
  concepto: text('concepto').notNull(),
  monto: real('monto').notNull(),
  pagado: integer('pagado').notNull().default(0),
  fecha: text('fecha'),
  created_at: text('created_at').notNull().default(sql`(datetime('now'))`),
});

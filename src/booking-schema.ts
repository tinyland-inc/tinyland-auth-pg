/**
 * MassageIthaca booking tables (public schema).
 *
 * Homegrown scheduling backend — replaces Acuity browser automation.
 * Tables: clients, bookings, time_blocks, business_hours_overrides, slot_reservations
 *
 * Depends on: services, practitioners (from content-schema.ts)
 *
 * v0.2.0: every table carries `tenant_id uuid NOT NULL`. Per-tenant uniques
 * on clients.email, bookings.confirmation_code, bookings.idempotency_key,
 * business_hours_overrides.date. Cross-table FKs remain single-column
 * (user_id, practitioner_id, etc.) — tenant isolation enforced via RLS at
 * query time.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  time,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Note: .js extension for ESM (tsc output). drizzle-kit resolves .ts at push time.
import { services, practitioners } from './content-schema.js';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    firstName: varchar('first_name', { length: 128 }).notNull(),
    lastName: varchar('last_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    notes: text('notes'),
    customFields: jsonb('custom_fields').$type<Record<string, string>>().default({}),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('clients_tenant_email_unique').on(t.tenantId, t.email),
    index('clients_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    confirmationCode: varchar('confirmation_code', { length: 16 }).notNull(),
    serviceId: uuid('service_id')
      .references(() => services.id)
      .notNull(),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    clientId: uuid('client_id')
      .references(() => clients.id)
      .notNull(),
    datetime: timestamp('datetime', { mode: 'string', withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { mode: 'string', withTimezone: true }).notNull(),
    duration: integer('duration').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('confirmed'),
    paymentStatus: varchar('payment_status', { length: 32 }).notNull().default('pending'),
    paymentMethod: varchar('payment_method', { length: 32 }),
    paymentRef: varchar('payment_ref', { length: 255 }),
    amountCents: integer('amount_cents').notNull(),
    notes: text('notes'),
    idempotencyKey: varchar('idempotency_key', { length: 255 }),
    cancelledAt: timestamp('cancelled_at', { mode: 'string', withTimezone: true }),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('bookings_tenant_confirmation_code_unique').on(t.tenantId, t.confirmationCode),
    uniqueIndex('bookings_tenant_idempotency_key_unique').on(t.tenantId, t.idempotencyKey),
    index('idx_bookings_schedule').on(t.practitionerId, t.datetime),
    index('idx_bookings_client').on(t.clientId),
    index('idx_bookings_datetime').on(t.datetime),
    index('bookings_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Time Blocks (breaks, vacations, holds)
// ---------------------------------------------------------------------------

export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    practitionerId: uuid('practitioner_id')
      .references(() => practitioners.id)
      .notNull(),
    startTime: timestamp('start_time', { mode: 'string', withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { mode: 'string', withTimezone: true }).notNull(),
    blockType: varchar('block_type', { length: 32 }).notNull(), // 'break', 'vacation', 'hold'
    title: varchar('title', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_time_blocks_schedule').on(t.practitionerId, t.startTime),
    index('time_blocks_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Business Hours Overrides (holiday closures, special hours)
// ---------------------------------------------------------------------------

export const businessHoursOverrides = pgTable(
  'business_hours_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    date: date('date').notNull(),
    opens: time('opens'), // NULL = closed for the day
    closes: time('closes'),
    reason: varchar('reason', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('business_hours_overrides_tenant_date_unique').on(t.tenantId, t.date),
    index('business_hours_overrides_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Slot Reservations (temporary holds during checkout)
// ---------------------------------------------------------------------------

export const slotReservations = pgTable(
  'slot_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    datetime: timestamp('datetime', { mode: 'string', withTimezone: true }).notNull(),
    duration: integer('duration').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string', withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { mode: 'string', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_reservations_datetime').on(t.datetime),
    index('idx_reservations_expires').on(t.expiresAt),
    index('slot_reservations_tenant_idx').on(t.tenantId),
  ],
);

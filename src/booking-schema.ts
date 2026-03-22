/**
 * MassageIthaca booking tables (public schema).
 *
 * Homegrown scheduling backend — replaces Acuity browser automation.
 * Tables: clients, bookings, time_blocks, business_hours_overrides
 *
 * Depends on: services, practitioners (from content-schema.ts)
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
} from 'drizzle-orm/pg-core';

// Note: .js extension for ESM (tsc output). drizzle-kit resolves .ts at push time.
import { services, practitioners } from './content-schema.js';

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: varchar('first_name', { length: 128 }).notNull(),
  lastName: varchar('last_name', { length: 128 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }),
  notes: text('notes'),
  customFields: jsonb('custom_fields').$type<Record<string, string>>().default({}),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    confirmationCode: varchar('confirmation_code', { length: 16 }).notNull().unique(),
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
    idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
    cancelledAt: timestamp('cancelled_at', { mode: 'string', withTimezone: true }),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_bookings_schedule').on(table.practitionerId, table.datetime),
    index('idx_bookings_client').on(table.clientId),
    index('idx_bookings_datetime').on(table.datetime),
  ],
);

// ---------------------------------------------------------------------------
// Time Blocks (breaks, vacations, holds)
// ---------------------------------------------------------------------------

export const timeBlocks = pgTable(
  'time_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    practitionerId: uuid('practitioner_id')
      .references(() => practitioners.id)
      .notNull(),
    startTime: timestamp('start_time', { mode: 'string', withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { mode: 'string', withTimezone: true }).notNull(),
    blockType: varchar('block_type', { length: 32 }).notNull(), // 'break', 'vacation', 'hold'
    title: varchar('title', { length: 255 }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_time_blocks_schedule').on(table.practitionerId, table.startTime),
  ],
);

// ---------------------------------------------------------------------------
// Business Hours Overrides (holiday closures, special hours)
// ---------------------------------------------------------------------------

export const businessHoursOverrides = pgTable('business_hours_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull().unique(),
  opens: time('opens'), // NULL = closed for the day
  closes: time('closes'),
  reason: varchar('reason', { length: 255 }),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Slot Reservations (temporary holds during checkout)
// ---------------------------------------------------------------------------

export const slotReservations = pgTable(
  'slot_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    practitionerId: uuid('practitioner_id').references(() => practitioners.id),
    datetime: timestamp('datetime', { mode: 'string', withTimezone: true }).notNull(),
    duration: integer('duration').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string', withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { mode: 'string', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_reservations_datetime').on(table.datetime),
    index('idx_reservations_expires').on(table.expiresAt),
  ],
);

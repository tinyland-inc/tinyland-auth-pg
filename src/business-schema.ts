/**
 * MassageIthaca business tables (public schema).
 *
 * These are the appointment/payment/booking tables specific to the
 * massage business, NOT part of the generic tinyland-auth adapter.
 *
 * v0.2.0: every table carries `tenant_id uuid NOT NULL`. acuity_id is now
 * unique per tenant (two tenants may share the same Acuity account id
 * namespace, but in practice each tenant has its own Acuity subdomain).
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Appointments (imported from Acuity, historical record)
// ---------------------------------------------------------------------------

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    acuityId: integer('acuity_id'),
    clientName: varchar('client_name', { length: 255 }).notNull(),
    clientEmail: varchar('client_email', { length: 255 }),
    clientPhone: varchar('client_phone', { length: 32 }),
    service: varchar('service', { length: 255 }).notNull(),
    duration: integer('duration').notNull(),
    priceCents: integer('price_cents').notNull(),
    paid: boolean('paid').notNull().default(false),
    paymentMethod: varchar('payment_method', { length: 32 }),
    appointmentDate: timestamp('appointment_date', { mode: 'string' }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantAcuityIdUnique: uniqueIndex('appointments_tenant_acuity_id_unique').on(
      t.tenantId,
      t.acuityId,
    ),
    tenantIdx: index('appointments_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Payments (processor-agnostic payment records)
// ---------------------------------------------------------------------------

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    processor: varchar('processor', { length: 32 }).notNull(),
    processorRef: varchar('processor_ref', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('payments_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Local Bookings (replaces Redis booking store from Phase 1B)
// ---------------------------------------------------------------------------

export const localBookings = pgTable(
  'local_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    serviceId: varchar('service_id', { length: 128 }).notNull(),
    serviceName: varchar('service_name', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 128 }),
    providerName: varchar('provider_name', { length: 255 }),
    datetime: timestamp('datetime', { mode: 'string' }).notNull(),
    duration: integer('duration').notNull(),
    client: jsonb('client').notNull().$type<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    }>(),
    paymentMethod: varchar('payment_method', { length: 32 }).notNull(),
    paymentTransactionId: varchar('payment_transaction_id', { length: 255 }),
    amountCents: integer('amount_cents').notNull(),
    paymentStatus: varchar('payment_status', { length: 32 }).notNull().default('pending'),
    reconciliationStatus: varchar('reconciliation_status', { length: 32 }).notNull().default('pending'),
    acuityAppointmentId: varchar('acuity_appointment_id', { length: 64 }),
    reconciledAt: timestamp('reconciled_at', { mode: 'string' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('local_bookings_tenant_idx').on(t.tenantId),
  }),
);

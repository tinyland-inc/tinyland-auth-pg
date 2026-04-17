/**
 * Gift Certificate & Package Schema
 *
 * Three tables for gift certificate purchases, package tracking,
 * and redemption records linked to bookings.
 *
 * NY law (GBL 396-i): Gift certificates cannot expire or have dormancy fees.
 *
 * v0.2.0: every table carries `tenant_id uuid NOT NULL`. Per-tenant uniques
 * on gift_certificates.code and packages.code.
 */

import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { bookings } from './booking-schema.js';
import { clients } from './booking-schema.js';

// ---------------------------------------------------------------------------
// Gift Certificates
// ---------------------------------------------------------------------------

export const giftCertificates = pgTable(
  'gift_certificates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    code: varchar('code', { length: 16 }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    balanceCents: integer('balance_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    purchaserName: varchar('purchaser_name', { length: 255 }).notNull(),
    purchaserEmail: varchar('purchaser_email', { length: 255 }).notNull(),
    recipientName: varchar('recipient_name', { length: 255 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    message: text('message'),
    stripeSessionId: varchar('stripe_session_id', { length: 255 }),
    stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
    issuedBy: varchar('issued_by', { length: 64 }), // admin handle for manual issuance
    redeemedAt: timestamp('redeemed_at', { mode: 'string', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('gift_certificates_tenant_code_unique').on(t.tenantId, t.code),
    index('idx_gc_code').on(t.code),
    index('idx_gc_status').on(t.status),
    index('idx_gc_recipient_email').on(t.recipientEmail),
    index('gift_certificates_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Packages (e.g., 5-pack sessions)
// ---------------------------------------------------------------------------

export const packages = pgTable(
  'packages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    code: varchar('code', { length: 16 }).notNull(),
    clientId: uuid('client_id').references(() => clients.id),
    packageType: varchar('package_type', { length: 64 }).notNull(),
    totalSessions: integer('total_sessions').notNull(),
    remainingSessions: integer('remaining_sessions').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    status: varchar('status', { length: 16 }).notNull().default('active'),
    purchaserName: varchar('purchaser_name', { length: 255 }).notNull(),
    purchaserEmail: varchar('purchaser_email', { length: 255 }).notNull(),
    stripeSessionId: varchar('stripe_session_id', { length: 255 }),
    stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
    issuedBy: varchar('issued_by', { length: 64 }),
    expiresAt: timestamp('expires_at', { mode: 'string', withTimezone: true }),
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('packages_tenant_code_unique').on(t.tenantId, t.code),
    index('idx_pkg_code').on(t.code),
    index('idx_pkg_client').on(t.clientId),
    index('idx_pkg_status').on(t.status),
    index('packages_tenant_idx').on(t.tenantId),
  ],
);

// ---------------------------------------------------------------------------
// Redemptions (polymorphic — links bookings to gift certs or packages)
// ---------------------------------------------------------------------------

export const redemptions = pgTable(
  'redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    bookingId: uuid('booking_id').references(() => bookings.id).notNull(),
    giftCertificateId: uuid('gift_certificate_id').references(() => giftCertificates.id),
    packageId: uuid('package_id').references(() => packages.id),
    type: varchar('type', { length: 16 }).notNull(), // 'gift_certificate' or 'package'
    amountCents: integer('amount_cents'), // for gift certs: amount deducted
    sessionNumber: integer('session_number'), // for packages: which session (1-5)
    createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_redemptions_booking').on(t.bookingId),
    index('idx_redemptions_gc').on(t.giftCertificateId),
    index('idx_redemptions_pkg').on(t.packageId),
    index('redemptions_tenant_idx').on(t.tenantId),
  ],
);

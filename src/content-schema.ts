/**
 * MassageIthaca content tables (public schema).
 *
 * Stores business content that was previously hardcoded in Svelte
 * components and TypeScript modules. Moving to PG enables admin
 * editing without code deploys.
 *
 * Tables: business_profile, services, business_hours, reviews, practitioners
 *
 * v0.2.0: every table carries `tenant_id uuid NOT NULL`. Per-tenant uniques
 * on services.acuity_id and practitioners.handle.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  time,
  smallint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Business Profile (single-row-per-tenant table)
// ---------------------------------------------------------------------------

export const businessProfile = pgTable(
  'business_profile',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 255 }),
    streetAddress: varchar('street_address', { length: 255 }).notNull(),
    suiteUnit: varchar('suite_unit', { length: 64 }),
    city: varchar('city', { length: 128 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    country: varchar('country', { length: 2 }).notNull().default('US'),
    latitude: numeric('latitude', { precision: 12, scale: 8 }),
    longitude: numeric('longitude', { precision: 12, scale: 8 }),
    licenseNumber: varchar('license_number', { length: 32 }),
    description: text('description'),
    slogan: varchar('slogan', { length: 255 }),
    websiteUrl: varchar('website_url', { length: 512 }),
    googleMapsUrl: text('google_maps_url'),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('business_profile_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    acuityId: varchar('acuity_id', { length: 64 }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 128 }),
    durationMinutes: integer('duration_minutes').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    active: boolean('active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantAcuityIdUnique: uniqueIndex('services_tenant_acuity_id_unique').on(
      t.tenantId,
      t.acuityId,
    ),
    tenantIdx: index('services_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Business Hours
// ---------------------------------------------------------------------------

export const businessHours = pgTable(
  'business_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    dayOfWeek: smallint('day_of_week').notNull(), // 0=Sunday .. 6=Saturday
    opens: time('opens').notNull(),
    closes: time('closes').notNull(),
    label: varchar('label', { length: 64 }),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('business_hours_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    reviewerName: varchar('reviewer_name', { length: 255 }).notNull(),
    rating: smallint('rating').notNull(), // 1-5
    text: text('text').notNull(),
    source: varchar('source', { length: 64 }).notNull().default('google'),
    tags: text('tags').array(),
    featured: boolean('featured').notNull().default(false),
    publishedAt: timestamp('published_at', { mode: 'string' }),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('reviews_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Practitioners
// ---------------------------------------------------------------------------

export const practitioners = pgTable(
  'practitioners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    handle: varchar('handle', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 128 }),
    bio: text('bio'),
    credentials: text('credentials').array(),
    specializations: text('specializations').array(),
    licenseNumber: varchar('license_number', { length: 32 }),
    photoUrl: varchar('photo_url', { length: 512 }),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantHandleUnique: uniqueIndex('practitioners_tenant_handle_unique').on(
      t.tenantId,
      t.handle,
    ),
    tenantIdx: index('practitioners_tenant_idx').on(t.tenantId),
  }),
);

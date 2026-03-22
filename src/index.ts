/**
 * @tummycrypt/tinyland-auth-pg
 *
 * PostgreSQL storage adapter for @tummycrypt/tinyland-auth,
 * backed by Neon Serverless PG + Drizzle ORM.
 */

export { PgStorageAdapter, createPgStorageAdapter } from './adapter.js';
export type { PgStorageConfig } from './adapter.js';
export * as schema from './schema.js';
export * as businessSchema from './business-schema.js';
export * as contentSchema from './content-schema.js';
export * as bookingSchema from './booking-schema.js';
export * as giftcertSchema from './giftcert-schema.js';
export * as intakeSchema from './intake-schema.js';

/**
 * @tummycrypt/tinyland-auth-pg
 *
 * PostgreSQL storage adapter for @tummycrypt/tinyland-auth,
 * supporting both Neon Serverless PG and standard node-postgres.
 */

export {
  PgStorageAdapter,
  NodePgStorageAdapter,
  createPgStorageAdapter,
  createNodePgStorageAdapter,
} from './adapter.js';
export type { PgStorageConfig, NodePgStorageConfig } from './adapter.js';
export * as schema from './schema.js';
export * as businessSchema from './business-schema.js';
export * as contentSchema from './content-schema.js';
export * as bookingSchema from './booking-schema.js';
export * as giftcertSchema from './giftcert-schema.js';
export * as intakeSchema from './intake-schema.js';

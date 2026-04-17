/**
 * Drizzle schema for tinyland-auth PG adapter.
 *
 * All tables live in the `auth` schema on Neon PG.
 *
 * v0.2.0: every row-bearing table now carries `tenant_id uuid NOT NULL`.
 * Previous single-column unique constraints on handle/email/token are now
 * composite unique indexes scoped to (tenant_id, <col>). Every table has a
 * plain `tenant_id` index to support RLS query performance.
 */

import {
  pgSchema,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const authSchema = pgSchema('auth');

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const users = authSchema.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    handle: varchar('handle', { length: 64 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 128 }),
    passwordHash: text('password_hash').notNull(),
    role: varchar('role', { length: 32 }).notNull().default('viewer'),
    isActive: boolean('is_active').notNull().default(true),
    isLocked: boolean('is_locked').default(false),
    lockReason: text('lock_reason'),
    lockedAt: timestamp('locked_at', { mode: 'string' }),
    needsOnboarding: boolean('needs_onboarding').notNull().default(true),
    onboardingStep: integer('onboarding_step').notNull().default(0),
    firstLogin: boolean('first_login').default(true),
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    totpSecretId: varchar('totp_secret_id', { length: 128 }),
    permissions: jsonb('permissions').$type<string[]>(),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    pronouns: varchar('pronouns', { length: 32 }),
    timezone: varchar('timezone', { length: 64 }),
    locale: varchar('locale', { length: 16 }),
    theme: varchar('theme', { length: 8 }),
    emailNotifications: boolean('email_notifications').default(true),
    loginAttempts: integer('login_attempts').default(0),
    lastFailedLoginAt: timestamp('last_failed_login_at', { mode: 'string' }),
    lastLoginAt: timestamp('last_login_at', { mode: 'string' }),
    passwordChangedAt: timestamp('password_changed_at', { mode: 'string' }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantHandleUnique: uniqueIndex('users_tenant_handle_unique').on(t.tenantId, t.handle),
    tenantEmailUnique: uniqueIndex('users_tenant_email_unique').on(t.tenantId, t.email),
    tenantIdx: index('users_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const sessions = authSchema.table(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'string' }).notNull(),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
    user: jsonb('user_data').$type<{
      id: string;
      username: string;
      name: string;
      role: string;
      needsOnboarding?: boolean;
      onboardingStep?: number;
    }>(),
    clientIp: varchar('client_ip', { length: 45 }).notNull().default('unknown'),
    clientIpMasked: varchar('client_ip_masked', { length: 45 }),
    userAgent: text('user_agent').notNull().default('unknown'),
    deviceType: varchar('device_type', { length: 16 }).default('unknown'),
    browserFingerprint: text('browser_fingerprint'),
    geoLocation: jsonb('geo_location').$type<{ country: string; city?: string }>(),
    tempTotpSecret: text('temp_totp_secret'),
    tempTotpExpiresAt: timestamp('temp_totp_expires_at', { mode: 'string' }),
  },
  (t) => ({
    tenantIdx: index('sessions_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// TOTP Secrets
// ---------------------------------------------------------------------------
// Existing PK was `handle`. With tenant isolation the PK becomes
// (tenant_id, handle) so two tenants may register the same handle.

export const totpSecrets = authSchema.table(
  'totp_secrets',
  {
    tenantId: uuid('tenant_id').notNull(),
    handle: varchar('handle', { length: 64 }).notNull(),
    userId: varchar('user_id', { length: 128 }).notNull(),
    encryptedSecret: text('encrypted_secret').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    salt: text('salt').notNull(),
    backupCodesGenerated: boolean('backup_codes_generated').notNull().default(false),
    version: integer('version').notNull().default(1),
    lastUsedAt: timestamp('last_used_at', { mode: 'string' }),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.handle] }),
    tenantIdx: index('totp_secrets_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Backup Codes
// ---------------------------------------------------------------------------
// Existing PK was `user_id`. With tenant isolation the PK becomes
// (tenant_id, user_id). user_id still FKs users.id (globally unique UUID).

export const backupCodes = authSchema.table(
  'backup_codes',
  {
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    codes: jsonb('codes').notNull().$type<Array<{
      id: string;
      hash: string;
      used: boolean;
      usedAt?: string;
    }>>(),
    generatedAt: timestamp('generated_at', { mode: 'string' }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { mode: 'string' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tenantId, t.userId] }),
    tenantIdx: index('backup_codes_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export const invitations = authSchema.table(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    token: text('token').notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 32 }).notNull(),
    createdBy: uuid('created_by').notNull().references(() => users.id),
    isActive: boolean('is_active').notNull().default(true),
    expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { mode: 'string' }),
    usedBy: uuid('used_by'),
    temporaryTotpSecret: text('temporary_totp_secret'),
    metadata: jsonb('metadata').$type<{
      inviterHandle: string;
      inviterDisplayName?: string;
      message?: string;
      customInstructions?: string;
    }>(),
    createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantTokenUnique: uniqueIndex('invitations_tenant_token_unique').on(t.tenantId, t.token),
    tenantIdx: index('invitations_tenant_idx').on(t.tenantId),
  }),
);

// ---------------------------------------------------------------------------
// Audit Events
// ---------------------------------------------------------------------------

export const auditEvents = authSchema.table(
  'audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    type: varchar('type', { length: 64 }).notNull(),
    userId: uuid('user_id'),
    targetUserId: uuid('target_user_id'),
    handle: varchar('handle', { length: 64 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    details: jsonb('details').notNull().$type<Record<string, unknown>>(),
    severity: varchar('severity', { length: 16 }).notNull().default('info'),
    source: varchar('source', { length: 16 }).notNull().default('system'),
    timestamp: timestamp('timestamp', { mode: 'string' }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('audit_events_tenant_idx').on(t.tenantId),
  }),
);

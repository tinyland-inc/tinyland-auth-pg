/**
 * PostgreSQL Storage Adapter for @tummycrypt/tinyland-auth
 *
 * Backed by Neon Serverless PG + Drizzle ORM.
 * Mirrors the RedisStorageAdapter API surface with SQL queries.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq, and, lt, gt, desc, sql, count as countFn } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as schema from './schema.js';
import type { IStorageAdapter, AuditEventFilters } from '@tummycrypt/tinyland-auth/storage';
import type {
  AdminUser,
  Session,
  SessionMetadata,
  EncryptedTOTPSecret,
  BackupCodeSet,
  AdminInvitation,
  AuditEvent,
} from '@tummycrypt/tinyland-auth/types';

export interface PgStorageConfig {
  /** Neon connection string (required) */
  connectionString: string;
  /** Session TTL in milliseconds (default: 7 days) */
  sessionMaxAge?: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Row → Domain mappers
// ---------------------------------------------------------------------------

type UserRow = typeof schema.users.$inferSelect;
type SessionRow = typeof schema.sessions.$inferSelect;
type TotpRow = typeof schema.totpSecrets.$inferSelect;
type BackupRow = typeof schema.backupCodes.$inferSelect;
type InviteRow = typeof schema.invitations.$inferSelect;
type AuditRow = typeof schema.auditEvents.$inferSelect;

const toAdminUser = (row: UserRow): AdminUser => ({
  id: row.id,
  handle: row.handle,
  email: row.email,
  displayName: row.displayName ?? undefined,
  passwordHash: row.passwordHash,
  role: row.role as AdminUser['role'],
  isActive: row.isActive,
  isLocked: row.isLocked ?? undefined,
  lockReason: row.lockReason ?? undefined,
  lockedAt: row.lockedAt ?? undefined,
  needsOnboarding: row.needsOnboarding,
  onboardingStep: row.onboardingStep,
  firstLogin: row.firstLogin ?? undefined,
  totpEnabled: row.totpEnabled,
  totpSecretId: row.totpSecretId ?? undefined,
  permissions: row.permissions ?? undefined,
  bio: row.bio ?? undefined,
  avatarUrl: row.avatarUrl ?? undefined,
  pronouns: row.pronouns ?? undefined,
  timezone: row.timezone ?? undefined,
  locale: row.locale ?? undefined,
  theme: (row.theme as AdminUser['theme']) ?? undefined,
  emailNotifications: row.emailNotifications ?? undefined,
  loginAttempts: row.loginAttempts ?? undefined,
  lastFailedLoginAt: row.lastFailedLoginAt ?? undefined,
  lastLoginAt: row.lastLoginAt ?? undefined,
  passwordChangedAt: row.passwordChangedAt ?? undefined,
  ipAddress: row.ipAddress ?? undefined,
  userAgent: row.userAgent ?? undefined,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.userId,
  expires: row.expires,
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
  user: row.user ?? undefined,
  clientIp: row.clientIp,
  clientIpMasked: row.clientIpMasked ?? undefined,
  userAgent: row.userAgent,
  deviceType: (row.deviceType as Session['deviceType']) ?? undefined,
  browserFingerprint: row.browserFingerprint ?? undefined,
  geoLocation: row.geoLocation ?? undefined,
  tempTotpSecret: row.tempTotpSecret ?? undefined,
  tempTotpExpiresAt: row.tempTotpExpiresAt ?? undefined,
});

const toTotpSecret = (row: TotpRow): EncryptedTOTPSecret => ({
  userId: row.userId,
  handle: row.handle,
  encryptedSecret: row.encryptedSecret,
  iv: row.iv,
  authTag: row.authTag,
  salt: row.salt,
  backupCodesGenerated: row.backupCodesGenerated,
  version: row.version,
  lastUsedAt: row.lastUsedAt ?? undefined,
  createdAt: row.createdAt,
});

const toBackupCodeSet = (row: BackupRow): BackupCodeSet => ({
  userId: row.userId,
  codes: row.codes,
  generatedAt: row.generatedAt,
  lastUsedAt: row.lastUsedAt ?? undefined,
});

const toInvitation = (row: InviteRow): AdminInvitation => ({
  id: row.id,
  token: row.token,
  email: row.email,
  role: row.role as AdminInvitation['role'],
  createdBy: row.createdBy,
  isActive: row.isActive,
  expiresAt: row.expiresAt,
  usedAt: row.usedAt ?? undefined,
  usedBy: row.usedBy ?? undefined,
  temporaryTotpSecret: row.temporaryTotpSecret ?? undefined,
  metadata: row.metadata ?? undefined,
  createdAt: row.createdAt,
});

const toAuditEvent = (row: AuditRow): AuditEvent => ({
  id: row.id,
  type: row.type as AuditEvent['type'],
  userId: row.userId ?? undefined,
  targetUserId: row.targetUserId ?? undefined,
  handle: row.handle ?? undefined,
  ipAddress: row.ipAddress ?? undefined,
  userAgent: row.userAgent ?? undefined,
  details: row.details,
  severity: row.severity as AuditEvent['severity'],
  source: row.source as AuditEvent['source'],
  timestamp: row.timestamp,
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PgStorageAdapter implements IStorageAdapter {
  private readonly db: NeonHttpDatabase<typeof schema>;
  private readonly sessionMaxAge: number;

  constructor(config: PgStorageConfig) {
    const client = neon(config.connectionString);
    this.db = drizzle(client, { schema });
    this.sessionMaxAge = config.sessionMaxAge ?? SEVEN_DAYS_MS;
  }

  // ==========================================================================
  // Lifecycle
  // ==========================================================================

  async init(): Promise<void> {
    // Verify connectivity with a simple query
    await this.db.execute(sql`SELECT 1`);
  }

  async close(): Promise<void> {
    // Neon HTTP client is stateless — no connection to close
  }

  // ==========================================================================
  // User Operations
  // ==========================================================================

  async getUser(id: string): Promise<AdminUser | null> {
    const rows = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return rows[0] ? toAdminUser(rows[0]) : null;
  }

  async getUserByHandle(handle: string): Promise<AdminUser | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.handle, handle.toLowerCase()))
      .limit(1);
    return rows[0] ? toAdminUser(rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<AdminUser | null> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);
    return rows[0] ? toAdminUser(rows[0]) : null;
  }

  async getAllUsers(): Promise<AdminUser[]> {
    const rows = await this.db.select().from(schema.users);
    return rows.map(toAdminUser);
  }

  async createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const rows = await this.db
      .insert(schema.users)
      .values({
        id,
        handle: user.handle.toLowerCase(),
        email: user.email.toLowerCase(),
        displayName: user.displayName,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive,
        needsOnboarding: user.needsOnboarding,
        onboardingStep: user.onboardingStep,
        totpEnabled: user.totpEnabled,
        permissions: user.permissions,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return toAdminUser(rows[0]!);
  }

  async updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser> {
    const existing = await this.getUser(id);
    if (!existing) throw new Error(`User ${id} not found`);

    // Fields that map 1:1 from AdminUser to DB columns
    const passthrough = [
      'displayName', 'passwordHash', 'role', 'isActive', 'isLocked',
      'lockReason', 'lockedAt', 'needsOnboarding', 'onboardingStep',
      'firstLogin', 'totpEnabled', 'totpSecretId', 'permissions',
      'lastLoginAt', 'passwordChangedAt', 'loginAttempts',
      'lastFailedLoginAt', 'ipAddress', 'userAgent', 'bio',
      'avatarUrl', 'pronouns', 'timezone', 'locale', 'theme',
      'emailNotifications',
    ] as const;

    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    // Handle/email need lowercasing
    if (updates.handle !== undefined) values.handle = updates.handle.toLowerCase();
    if (updates.email !== undefined) values.email = updates.email.toLowerCase();

    // All other fields pass through directly
    for (const key of passthrough) {
      if (updates[key] !== undefined) values[key] = updates[key];
    }

    const rows = await this.db
      .update(schema.users)
      .set(values)
      .where(eq(schema.users.id, id))
      .returning();

    return toAdminUser(rows[0]!);
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;

    // Cascade handles sessions and backup codes via FK
    // Clean up TOTP and invitations manually
    await this.deleteTOTPSecret(user.handle);
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
    return true;
  }

  async hasUsers(): Promise<boolean> {
    const result = await this.db.select({ n: countFn() }).from(schema.users).limit(1);
    return (result[0]?.n ?? 0) > 0;
  }

  // ==========================================================================
  // Session Operations
  // ==========================================================================

  async getSession(id: string): Promise<Session | null> {
    const rows = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1);

    if (!rows[0]) return null;

    const session = toSession(rows[0]);
    if (new Date(session.expires) < new Date()) {
      await this.deleteSession(id);
      return null;
    }

    return session;
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    const now = new Date().toISOString();
    const rows = await this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), gt(schema.sessions.expires, now)));

    return rows.map(toSession);
  }

  async getAllSessions(): Promise<Session[]> {
    const now = new Date().toISOString();
    const rows = await this.db
      .select()
      .from(schema.sessions)
      .where(gt(schema.sessions.expires, now));

    return rows.map(toSession);
  }

  async createSession(
    userId: string,
    user: Partial<AdminUser>,
    metadata?: SessionMetadata,
  ): Promise<Session> {
    const id = randomUUID();
    const now = new Date();
    const expires = new Date(now.getTime() + this.sessionMaxAge);

    const sessionUser = {
      id: user.id || userId,
      username: user.handle || '',
      name: user.displayName || user.handle || '',
      role: user.role || 'viewer',
      needsOnboarding: user.needsOnboarding,
      onboardingStep: user.onboardingStep,
    };

    const rows = await this.db
      .insert(schema.sessions)
      .values({
        id,
        userId,
        expires: expires.toISOString(),
        expiresAt: expires.toISOString(),
        createdAt: now.toISOString(),
        user: sessionUser,
        clientIp: metadata?.clientIp || 'unknown',
        clientIpMasked: metadata?.clientIpMasked,
        userAgent: metadata?.userAgent || 'unknown',
        deviceType: metadata?.deviceType || 'unknown',
        browserFingerprint: metadata?.browserFingerprint,
        geoLocation: metadata?.geoLocation,
      })
      .returning();

    return toSession(rows[0]!);
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const existing = await this.getSession(id);
    if (!existing) throw new Error(`Session ${id} not found`);

    const values: Record<string, unknown> = {};
    if (updates.expires !== undefined) {
      values.expires = updates.expires;
      values.expiresAt = updates.expires;
    }
    if (updates.user !== undefined) values.user = updates.user;
    if (updates.tempTotpSecret !== undefined) values.tempTotpSecret = updates.tempTotpSecret;
    if (updates.tempTotpExpiresAt !== undefined) values.tempTotpExpiresAt = updates.tempTotpExpiresAt;

    const rows = await this.db
      .update(schema.sessions)
      .set(values)
      .where(eq(schema.sessions.id, id))
      .returning();

    return toSession(rows[0]!);
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.db.delete(schema.sessions).where(eq(schema.sessions.id, id));
    return (result?.rowCount ?? 0) > 0;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.db
      .delete(schema.sessions)
      .where(eq(schema.sessions.userId, userId));
    return result?.rowCount ?? 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .delete(schema.sessions)
      .where(lt(schema.sessions.expires, now));
    return result?.rowCount ?? 0;
  }

  // ==========================================================================
  // TOTP Operations
  // ==========================================================================

  async getTOTPSecret(handle: string): Promise<EncryptedTOTPSecret | null> {
    const rows = await this.db
      .select()
      .from(schema.totpSecrets)
      .where(eq(schema.totpSecrets.handle, handle.toLowerCase()))
      .limit(1);

    return rows[0] ? toTotpSecret(rows[0]) : null;
  }

  async saveTOTPSecret(handle: string, secret: EncryptedTOTPSecret): Promise<void> {
    await this.db
      .insert(schema.totpSecrets)
      .values({
        handle: handle.toLowerCase(),
        userId: secret.userId,
        encryptedSecret: secret.encryptedSecret,
        iv: secret.iv,
        authTag: secret.authTag,
        salt: secret.salt,
        backupCodesGenerated: secret.backupCodesGenerated,
        version: secret.version,
        lastUsedAt: secret.lastUsedAt,
        createdAt: secret.createdAt,
      })
      .onConflictDoUpdate({
        target: schema.totpSecrets.handle,
        set: {
          encryptedSecret: secret.encryptedSecret,
          iv: secret.iv,
          authTag: secret.authTag,
          salt: secret.salt,
          backupCodesGenerated: secret.backupCodesGenerated,
          version: secret.version,
          lastUsedAt: secret.lastUsedAt,
        },
      });
  }

  async deleteTOTPSecret(handle: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.totpSecrets)
      .where(eq(schema.totpSecrets.handle, handle.toLowerCase()));
    return (result?.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // Backup Code Operations
  // ==========================================================================

  async getBackupCodes(userId: string): Promise<BackupCodeSet | null> {
    const rows = await this.db
      .select()
      .from(schema.backupCodes)
      .where(eq(schema.backupCodes.userId, userId))
      .limit(1);

    return rows[0] ? toBackupCodeSet(rows[0]) : null;
  }

  async saveBackupCodes(userId: string, codes: BackupCodeSet): Promise<void> {
    await this.db
      .insert(schema.backupCodes)
      .values({
        userId,
        codes: codes.codes,
        generatedAt: codes.generatedAt,
        lastUsedAt: codes.lastUsedAt,
      })
      .onConflictDoUpdate({
        target: schema.backupCodes.userId,
        set: {
          codes: codes.codes,
          generatedAt: codes.generatedAt,
          lastUsedAt: codes.lastUsedAt,
        },
      });
  }

  async deleteBackupCodes(userId: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.backupCodes)
      .where(eq(schema.backupCodes.userId, userId));
    return (result?.rowCount ?? 0) > 0;
  }

  // ==========================================================================
  // Invitation Operations
  // ==========================================================================

  async getInvitation(token: string): Promise<AdminInvitation | null> {
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.token, token))
      .limit(1);

    if (!rows[0]) return null;
    const invite = toInvitation(rows[0]);
    if (new Date(invite.expiresAt) < new Date()) return null;
    return invite;
  }

  async getInvitationById(id: string): Promise<AdminInvitation | null> {
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, id))
      .limit(1);

    return rows[0] ? toInvitation(rows[0]) : null;
  }

  async getAllInvitations(): Promise<AdminInvitation[]> {
    const rows = await this.db.select().from(schema.invitations);
    return rows.map(toInvitation);
  }

  async getPendingInvitations(): Promise<AdminInvitation[]> {
    const now = new Date().toISOString();
    const rows = await this.db
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.isActive, true),
          gt(schema.invitations.expiresAt, now),
          sql`${schema.invitations.usedAt} IS NULL`,
        ),
      );

    return rows.map(toInvitation);
  }

  async createInvitation(
    invitation: Omit<AdminInvitation, 'id'>,
  ): Promise<AdminInvitation> {
    const id = randomUUID();

    const rows = await this.db
      .insert(schema.invitations)
      .values({
        id,
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        createdBy: invitation.createdBy,
        isActive: invitation.isActive,
        expiresAt: invitation.expiresAt,
        usedAt: invitation.usedAt,
        usedBy: invitation.usedBy,
        temporaryTotpSecret: invitation.temporaryTotpSecret,
        metadata: invitation.metadata,
        createdAt: invitation.createdAt,
      })
      .returning();

    return toInvitation(rows[0]!);
  }

  async updateInvitation(
    token: string,
    updates: Partial<AdminInvitation>,
  ): Promise<AdminInvitation> {
    const existing = await this.getInvitation(token);
    if (!existing) throw new Error('Invitation not found');

    const values: Record<string, unknown> = {};
    if (updates.isActive !== undefined) values.isActive = updates.isActive;
    if (updates.usedAt !== undefined) values.usedAt = updates.usedAt;
    if (updates.usedBy !== undefined) values.usedBy = updates.usedBy;
    if (updates.metadata !== undefined) values.metadata = updates.metadata;

    const rows = await this.db
      .update(schema.invitations)
      .set(values)
      .where(eq(schema.invitations.token, token))
      .returning();

    return toInvitation(rows[0]!);
  }

  async deleteInvitation(token: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.invitations)
      .where(eq(schema.invitations.token, token));
    return (result?.rowCount ?? 0) > 0;
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .delete(schema.invitations)
      .where(lt(schema.invitations.expiresAt, now));
    return result?.rowCount ?? 0;
  }

  // ==========================================================================
  // Audit Operations
  // ==========================================================================

  async logAuditEvent(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent> {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const rows = await this.db
      .insert(schema.auditEvents)
      .values({
        id,
        type: event.type as string,
        userId: event.userId,
        targetUserId: event.targetUserId,
        handle: event.handle,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details,
        severity: event.severity,
        source: event.source,
        timestamp: event.timestamp,
      })
      .returning();

    return toAuditEvent(rows[0]!);
  }

  async getAuditEvents(filters: AuditEventFilters): Promise<AuditEvent[]> {
    const conditions = [];

    if (filters.startDate) {
      conditions.push(gt(schema.auditEvents.timestamp, filters.startDate.toISOString()));
    }
    if (filters.endDate) {
      conditions.push(lt(schema.auditEvents.timestamp, filters.endDate.toISOString()));
    }
    if (filters.type) {
      conditions.push(eq(schema.auditEvents.type, filters.type));
    }
    if (filters.userId) {
      conditions.push(eq(schema.auditEvents.userId, filters.userId));
    }
    if (filters.severity) {
      conditions.push(eq(schema.auditEvents.severity, filters.severity));
    }

    let query = this.db
      .select()
      .from(schema.auditEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditEvents.timestamp));

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }
    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    const rows = await query;
    return rows.map(toAuditEvent);
  }

  async getRecentAuditEvents(limit = 100): Promise<AuditEvent[]> {
    const rows = await this.db
      .select()
      .from(schema.auditEvents)
      .orderBy(desc(schema.auditEvents.timestamp))
      .limit(limit);

    return rows.map(toAuditEvent);
  }
}

/**
 * Factory function for creating a PgStorageAdapter
 */
export const createPgStorageAdapter = (config: PgStorageConfig): PgStorageAdapter =>
  new PgStorageAdapter(config);

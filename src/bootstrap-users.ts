import { hashPassword as defaultHashPassword } from '@tummycrypt/tinyland-auth';
import type { AdminRole, AdminUser } from '@tummycrypt/tinyland-auth/types';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import {
  createNodePgStorageAdapter,
  createPgStorageAdapter,
  type TenantScoped,
} from './adapter.js';
import * as schema from './schema.js';

export type BootstrapPasswordHasher = (password: string) => string | Promise<string>;

export interface BootstrapUserInput {
  handle: string;
  email: string;
  displayName?: string;
  password?: string;
  pin?: string;
  passwordHash?: string;
  role: AdminRole;
  isActive?: boolean;
  needsOnboarding?: boolean;
  onboardingStep?: number;
  totpEnabled?: boolean;
  permissions?: string[];
}

export interface BootstrapUserStorage {
  getUserByHandle(
    tenantId: string,
    handle: string,
  ): Promise<TenantScoped<AdminUser> | null>;
  createUser(
    tenantId: string,
    user: Omit<AdminUser, 'id' | 'tenantId'>,
  ): Promise<TenantScoped<AdminUser>>;
  updateUser(
    tenantId: string,
    id: string,
    updates: Partial<AdminUser>,
  ): Promise<TenantScoped<AdminUser>>;
}

interface BootstrapUsersBaseConfig {
  tenantId: string;
  users: readonly BootstrapUserInput[];
  passwordHasher?: BootstrapPasswordHasher;
  updateExisting?: boolean;
}

export type BootstrapUsersConfig = BootstrapUsersBaseConfig & (
  | {
      storage: BootstrapUserStorage;
      pool?: never;
      connectionString?: never;
      poolConfig?: never;
    }
  | {
      pool: Pool;
      storage?: never;
      connectionString?: never;
      poolConfig?: never;
    }
  | {
      connectionString: string;
      poolConfig?: PoolConfig;
      storage?: never;
      pool?: never;
    }
);

export interface BootstrapUserResult {
  handle: string;
  email: string;
  action: 'created' | 'updated' | 'unchanged';
  user: TenantScoped<AdminUser>;
}

export interface BootstrapUsersResult {
  created: number;
  updated: number;
  unchanged: number;
  users: BootstrapUserResult[];
}

interface ResolvedStorage {
  storage: BootstrapUserStorage;
  close?: () => Promise<void>;
}

const normalizeBootstrapUser = (
  user: BootstrapUserInput,
  index: number,
): BootstrapUserInput & { handle: string; email: string } => {
  const handle = user.handle?.trim().toLowerCase() ?? '';
  if (!handle) {
    throw new Error(`Bootstrap user at index ${index} is missing a handle`);
  }

  const email = user.email?.trim().toLowerCase() ?? '';
  if (!email.includes('@')) {
    throw new Error(`Bootstrap user ${handle} must have a valid email`);
  }

  if (!user.role) {
    throw new Error(`Bootstrap user ${handle} is missing a role`);
  }

  if (!user.passwordHash && !user.password && !user.pin) {
    throw new Error(
      `Bootstrap user ${handle} must provide passwordHash, password, or pin`,
    );
  }

  return {
    ...user,
    handle,
    email,
    displayName: user.displayName?.trim(),
  };
};

const resolvePasswordHash = async (
  user: BootstrapUserInput,
  passwordHasher: BootstrapPasswordHasher,
): Promise<string> => {
  if (user.passwordHash) {
    return user.passwordHash;
  }

  const password = user.password ?? user.pin;
  if (!password) {
    throw new Error(`Bootstrap user ${user.handle} is missing a password`);
  }

  return passwordHasher(password);
};

const toCreateUser = (
  user: BootstrapUserInput & { handle: string; email: string },
  passwordHash: string,
): Omit<AdminUser, 'id' | 'tenantId'> => {
  const now = new Date().toISOString();

  return {
    handle: user.handle,
    email: user.email,
    displayName: user.displayName,
    passwordHash,
    role: user.role,
    isActive: user.isActive ?? true,
    needsOnboarding: user.needsOnboarding ?? false,
    onboardingStep: user.onboardingStep ?? 0,
    totpEnabled: user.totpEnabled ?? false,
    permissions: user.permissions,
    createdAt: now,
    updatedAt: now,
  };
};

const toUpdateUser = (
  user: BootstrapUserInput & { handle: string; email: string },
  passwordHash: string,
): Partial<AdminUser> => {
  const updates: Partial<AdminUser> = {
    handle: user.handle,
    email: user.email,
    displayName: user.displayName,
    passwordHash,
    role: user.role,
    updatedAt: new Date().toISOString(),
  };

  if (user.isActive !== undefined) updates.isActive = user.isActive;
  if (user.needsOnboarding !== undefined) {
    updates.needsOnboarding = user.needsOnboarding;
  }
  if (user.onboardingStep !== undefined) {
    updates.onboardingStep = user.onboardingStep;
  }
  if (user.totpEnabled !== undefined) updates.totpEnabled = user.totpEnabled;
  if (user.permissions !== undefined) updates.permissions = user.permissions;

  return updates;
};

const resolveStorage = (config: BootstrapUsersConfig): ResolvedStorage => {
  if (config.storage !== undefined) {
    return { storage: config.storage };
  }

  if (config.pool !== undefined) {
    const db = drizzleNodePg(config.pool, { schema });
    return { storage: createPgStorageAdapter({ db }) };
  }

  const adapter = createNodePgStorageAdapter({
    connectionString: config.connectionString,
    poolConfig: config.poolConfig,
  });

  return {
    storage: adapter,
    close: async () => {
      await adapter.close();
    },
  };
};

export const bootstrapUsers = async (
  config: BootstrapUsersConfig,
): Promise<BootstrapUsersResult> => {
  if (!config.tenantId) {
    throw new Error('bootstrapUsers: tenantId is required');
  }
  if (config.users.length === 0) {
    throw new Error('bootstrapUsers: users must not be empty');
  }

  const passwordHasher = config.passwordHasher ?? defaultHashPassword;
  const updateExisting = config.updateExisting ?? true;
  const { storage, close } = resolveStorage(config);

  const results: BootstrapUserResult[] = [];

  try {
    for (const [index, rawUser] of config.users.entries()) {
      const user = normalizeBootstrapUser(rawUser, index);
      const existing = await storage.getUserByHandle(config.tenantId, user.handle);

      if (existing && !updateExisting) {
        results.push({
          handle: user.handle,
          email: user.email,
          action: 'unchanged',
          user: existing,
        });
        continue;
      }

      const passwordHash = await resolvePasswordHash(user, passwordHasher);

      if (!existing) {
        const created = await storage.createUser(
          config.tenantId,
          toCreateUser(user, passwordHash),
        );
        results.push({
          handle: user.handle,
          email: user.email,
          action: 'created',
          user: created,
        });
        continue;
      }

      const updated = await storage.updateUser(
        config.tenantId,
        existing.id,
        toUpdateUser(user, passwordHash),
      );
      results.push({
        handle: user.handle,
        email: user.email,
        action: 'updated',
        user: updated,
      });
    }
  } finally {
    await close?.();
  }

  return {
    created: results.filter((result) => result.action === 'created').length,
    updated: results.filter((result) => result.action === 'updated').length,
    unchanged: results.filter((result) => result.action === 'unchanged').length,
    users: results,
  };
};

# @tummycrypt/tinyland-auth-pg

PostgreSQL storage adapter for [@tummycrypt/tinyland-auth](https://github.com/Jesssullivan/tinyland-auth), backed by [Drizzle ORM](https://orm.drizzle.team) with driver-agnostic construction and multi-tenant scoping.

Supports Neon HTTP, `postgres.js`, and `node-postgres`. Use `createNodePgStorageAdapter()`
when you want the package to own a `pg.Pool`, or `createPgStorageAdapter({ db })`
when you already have a pre-built Drizzle client.

> **0.2.0 is a breaking release.** Every adapter method now takes `tenantId: string`
> as its first parameter. Every row-bearing table has `tenant_id uuid NOT NULL`.
> See [`CHANGELOG.md`](./CHANGELOG.md#020--2026-04-17) for the full migration guide.

## Installation

```bash
npm install @tummycrypt/tinyland-auth-pg
# or
pnpm add @tummycrypt/tinyland-auth-pg
```

### Peer Dependencies

```bash
npm install @tummycrypt/tinyland-auth
```

## Quick Start (0.2.0+)

### With `node-postgres` (owned pool; recommended for CNPG / local PG)

```typescript
import { createNodePgStorageAdapter } from '@tummycrypt/tinyland-auth-pg';

const adapter = createNodePgStorageAdapter({
  connectionString: process.env.DATABASE_URL!,
  poolConfig: { max: 10 },
});

const user = await adapter.getUser('<tenant-uuid>', '<user-id>');
```

### With `postgres.js` (recommended for PgBouncer transaction mode)

```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createPgStorageAdapter } from '@tummycrypt/tinyland-auth-pg';
import * as schema from '@tummycrypt/tinyland-auth-pg/schema';

// prepare: false is required when talking to PgBouncer in transaction mode
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 10 });
const db = drizzle(sql, { schema });

const storage = createPgStorageAdapter({ db });

// Every method takes tenantId first
const user = await storage.getUser('<tenant-uuid>', '<user-id>');
```

### With Neon HTTP (legacy, still supported)

```typescript
import { createPgStorageAdapter } from '@tummycrypt/tinyland-auth-pg';

const storage = createPgStorageAdapter({
  connectionString: process.env.DATABASE_URL!,
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (default)
});

const user = await storage.getUser('<tenant-uuid>', '<user-id>');
```

### Row-Level Security recommended pattern

Pair the adapter with a `withTenant` wrapper at the app-layer so every query
also flows through an RLS `SET LOCAL`. The explicit `tenantId` param is your
first line of defense; the `SET LOCAL` is belt-and-suspenders if a call-site
ever forgets to scope.

```typescript
await sql.begin(async (tx) => {
  await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  return storage.getUser(tenantId, userId);
});
```

## Schema Overview

The package exports six Drizzle schema modules, each targeting a specific domain:

| Export | Schema | Tables | Purpose |
|--------|--------|--------|---------|
| `./schema` | `auth` | users, sessions, totp_secrets, backup_codes, invitations, audit_events | Authentication and authorization |
| `./content-schema` | `public` | business_profile, services, business_hours, reviews, practitioners | CMS content |
| `./booking-schema` | `public` | clients, bookings, time_blocks, business_hours_overrides, slot_reservations | Scheduling and appointments |
| `./giftcert-schema` | `public` | gift_certificates, gift_certificate_redemptions | Gift certificate tracking |
| `./intake-schema` | `public` | intake_submissions | Patient intake forms |
| `./business-schema` | `public` | (composite re-export) | Business domain aggregation |

### Auth Schema (`auth.*`)

- **users** -- Admin users with roles (viewer, editor, business_owner, developer), PIN hashes, TOTP state, onboarding tracking
- **sessions** -- DB-backed sessions with HMAC-signed UUIDs, metadata (IP, user agent), configurable TTL
- **totp_secrets** -- AES-encrypted TOTP secrets, linked to users
- **backup_codes** -- Bcrypt-hashed one-time recovery codes
- **invitations** -- Email-based user invitations with token + expiry
- **audit_events** -- Timestamped auth event log (login, logout, failed attempts, role changes)

### Booking Schema (`public.*`)

- **clients** -- Client directory (name, email, phone, notes)
- **bookings** -- Appointment records with status (confirmed, cancelled, completed, no_show), payment tracking
- **time_blocks** -- Practitioner availability blocks (break, vacation, hold)
- **business_hours_overrides** -- Date-specific hour overrides
- **slot_reservations** -- Temporary slot holds during booking flow (TTL-based)

## Drizzle Migrations

Push schema changes directly (development):

```bash
# Auth schema
DATABASE_URL="postgresql://..." pnpm db:push

# Public schema (booking, content)
DATABASE_URL="postgresql://..." npx drizzle-kit push --config=drizzle.public.config.ts
```

Generate migration files (production):

```bash
DATABASE_URL="postgresql://..." pnpm db:generate
DATABASE_URL="postgresql://..." pnpm db:migrate
```

## API Reference

### `createPgStorageAdapter(config: PgStorageConfig): PgStorageAdapter`

Factory function that returns a Pattern B tenant-scoped adapter.

```typescript
type PgStorageConfig =
  | { db: Database; sessionMaxAge?: number }       // driver injection (recommended)
  | { connectionString: string; sessionMaxAge?: number }; // legacy neon-http

type Database =
  | NeonHttpDatabase<typeof schema>
  | NodePgDatabase<typeof schema>
  | PostgresJsDatabase<typeof schema>;
```

Both branches validate their input at construction time and throw loudly on
nullish `db` or empty `connectionString` rather than deferring to the first
query.

### `createNodePgStorageAdapter(config: NodePgStorageConfig): NodePgStorageAdapter`

Factory function that constructs and owns a `pg.Pool` for standard PostgreSQL.

```typescript
interface NodePgStorageConfig {
  connectionString: string;
  sessionMaxAge?: number;
  poolConfig?: PoolConfig;
  closeOnDispose?: boolean; // default true
}
```

### `PgStorageAdapter`

Every method accepts `tenantId: string` as its **first parameter** and returns
`TenantScoped<T>` where the domain type carries `tenantId`. Key methods:

#### User Management
- `getUser(tenantId, id): Promise<TenantScoped<AdminUser> | null>`
- `getUserByHandle(tenantId, handle): Promise<TenantScoped<AdminUser> | null>`
- `getUserByEmail(tenantId, email): Promise<TenantScoped<AdminUser> | null>`
- `createUser(tenantId, user): Promise<TenantScoped<AdminUser>>`
- `updateUser(tenantId, id, updates): Promise<TenantScoped<AdminUser>>`
- `deleteUser(tenantId, id): Promise<void>`
- `getAllUsers(tenantId): Promise<TenantScoped<AdminUser>[]>`
- `hasUsers(tenantId): Promise<boolean>`

#### Session Management
- `createSession(tenantId, userId, metadata?): Promise<TenantScoped<Session>>`
- `getSession(tenantId, sessionId): Promise<TenantScoped<Session> | null>`
- `updateSession(tenantId, sessionId, updates): Promise<TenantScoped<Session>>`
- `deleteSession(tenantId, sessionId): Promise<void>`
- `deleteUserSessions(tenantId, userId): Promise<void>`
- `getSessionsByUser(tenantId, userId): Promise<TenantScoped<Session>[]>`
- `getAllSessions(tenantId): Promise<TenantScoped<Session>[]>`
- `cleanupExpiredSessions(tenantId): Promise<number>`

#### TOTP / Backup Codes
- `saveTOTPSecret(tenantId, handle, secret): Promise<void>`
- `getTOTPSecret(tenantId, handle): Promise<EncryptedTOTPSecret | null>`
- `deleteTOTPSecret(tenantId, handle): Promise<void>`
- `saveBackupCodes(tenantId, userId, codes): Promise<void>`
- `getBackupCodes(tenantId, userId): Promise<BackupCodeSet | null>`
- `deleteBackupCodes(tenantId, userId): Promise<void>`

#### Invitations
- `createInvitation(tenantId, invitation): Promise<TenantScoped<Invitation>>`
- `getInvitation(tenantId, token): Promise<TenantScoped<Invitation> | null>`
- `getInvitationById(tenantId, id): Promise<TenantScoped<Invitation> | null>`
- `getAllInvitations(tenantId): Promise<TenantScoped<Invitation>[]>`
- `getPendingInvitations(tenantId): Promise<TenantScoped<Invitation>[]>`
- `updateInvitation(tenantId, token, updates): Promise<TenantScoped<Invitation>>`
- `deleteInvitation(tenantId, token): Promise<void>`
- `cleanupExpiredInvitations(tenantId): Promise<number>`

#### Audit Log
- `logAuditEvent(tenantId, event): Promise<void>`
- `getAuditEvents(tenantId, filters?): Promise<AuditEvent[]>`

> **Interface note:** the class does not `implements IStorageAdapter` from
> `@tummycrypt/tinyland-auth@0.2.x` because the peer package predates Pattern B.
> An interface uplift will ship with tinyland-auth 0.3.0 and this adapter will
> re-implement it then. Until then, consume the concrete class or type against
> the exported method signatures directly.

### `NodePgStorageAdapter`

Subclass of `PgStorageAdapter` that exposes its owned `pool: Pool` and closes
that pool by default when `adapter.close()` is called.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Neon, CNPG, local PG, or other supported deployments |

## Development

```bash
pnpm install
pnpm test          # Run tests
pnpm build         # Compile TypeScript
pnpm test:watch    # Watch mode
```

### Nix

```bash
nix develop        # Enter dev shell with Node 20 + pnpm + tsc
```

## License

MIT

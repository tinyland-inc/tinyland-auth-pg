# @tummycrypt/tinyland-auth-pg

PostgreSQL storage adapter for [@tummycrypt/tinyland-auth](https://github.com/Jesssullivan/tinyland-auth), backed by [Drizzle ORM](https://orm.drizzle.team) with either:

- [Neon Serverless Postgres](https://neon.tech) over the HTTP driver
- standard node-postgres for CNPG, local PostgreSQL, and other conventional Postgres deployments

Implements the full `IStorageAdapter` interface from tinyland-auth, replacing in-memory or Redis-backed storage with durable PostgreSQL persistence.

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

## Quick Start

### Neon / serverless HTTP

```typescript
import { createPgStorageAdapter } from '@tummycrypt/tinyland-auth-pg';

const storage = createPgStorageAdapter({
  connectionString: process.env.DATABASE_URL!,
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (default)
});

// Use with tinyland-auth SessionManager
import { SessionManager } from '@tummycrypt/tinyland-auth';

const sessions = new SessionManager(storage);
const session = await sessions.createSession(userId, metadata);
```

### Standard PostgreSQL / CNPG / local dev

```typescript
import { createNodePgStorageAdapter } from '@tummycrypt/tinyland-auth-pg';

const storage = createNodePgStorageAdapter({
  connectionString: process.env.DATABASE_URL!,
  sessionMaxAge: 7 * 24 * 60 * 60 * 1000,
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

### `createPgStorageAdapter(config: PgStorageConfig): IStorageAdapter`

Factory function that returns a fully-implemented `IStorageAdapter` backed by Neon HTTP.

```typescript
interface PgStorageConfig {
  /** PostgreSQL connection string (required) */
  connectionString: string;
  /** Session TTL in milliseconds (default: 7 days) */
  sessionMaxAge?: number;
}
```

### `createNodePgStorageAdapter(config: NodePgStorageConfig): IStorageAdapter`

Factory function that returns a fully-implemented `IStorageAdapter` backed by node-postgres.

```typescript
interface NodePgStorageConfig extends PgStorageConfig {
  /** Whether adapter.close() should end the underlying pg pool/client. Default: true */
  closeOnDispose?: boolean;
}
```

### `PgStorageAdapter`

Neon-backed adapter class used by `createPgStorageAdapter`.

### `NodePgStorageAdapter`

node-postgres-backed adapter class used by `createNodePgStorageAdapter`.

Both classes implement `IStorageAdapter` from `@tummycrypt/tinyland-auth/storage`. Key methods:

#### User Management
- `getUser(id: string): Promise<AdminUser | null>`
- `getUserByHandle(handle: string): Promise<AdminUser | null>`
- `getUserByEmail(email: string): Promise<AdminUser | null>`
- `createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser>`
- `updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser>`
- `getAllUsers(): Promise<AdminUser[]>`
- `hasUsers(): Promise<boolean>`

#### Session Management
- `createSession(userId: string, user: Partial<AdminUser>, metadata?: SessionMetadata): Promise<Session>`
- `getSession(sessionId: string): Promise<Session | null>`
- `deleteSession(sessionId: string): Promise<boolean>`
- `deleteUserSessions(userId: string): Promise<number>`
- `cleanupExpiredSessions(): Promise<number>`

#### TOTP
- `saveTOTPSecret(handle: string, encrypted: EncryptedTOTPSecret): Promise<void>`
- `getTOTPSecret(handle: string): Promise<EncryptedTOTPSecret | null>`
- `deleteTOTPSecret(handle: string): Promise<boolean>`

#### Backup Codes
- `saveBackupCodes(userId: string, codes: BackupCodeSet): Promise<void>`
- `getBackupCodes(userId: string): Promise<BackupCodeSet | null>`

#### Invitations
- `createInvitation(invitation: Omit<AdminInvitation, 'id'>): Promise<AdminInvitation>`
- `getInvitation(token: string): Promise<AdminInvitation | null>`
- `updateInvitation(token: string, updates: Partial<AdminInvitation>): Promise<AdminInvitation>`

#### Audit Log
- `logAuditEvent(event: Omit<AuditEvent, 'id'>): Promise<AuditEvent>`
- `getAuditEvents(filters: AuditEventFilters): Promise<AuditEvent[]>`
- `getRecentAuditEvents(limit?: number): Promise<AuditEvent[]>`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Use the Neon factory for Neon HTTP deployments and the node-postgres factory for CNPG/local PG. |

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

## Release

The npm registry already has `@tummycrypt/tinyland-auth-pg@0.2.0`, so the
node-postgres / CNPG support work should publish as `0.2.1` or newer.

Actual npm publishing is handled in CI via [publish.yml](./.github/workflows/publish.yml),
not from a local shell.

Recommended release flow:

```bash
pnpm build
pnpm test
pnpm pack --pack-destination .artifacts
```

Then trigger CI publish by either:

```text
- publishing a GitHub release whose tag matches package.json (for example `v0.2.1`)
- or running the Publish workflow manually with `dry_run=false`
```

The workflow:

- runs on Node 22 with pnpm 10
- verifies tests, build output, and tag-to-version alignment
- publishes to npm with `NPM_TOKEN` when configured
- otherwise falls back to npm OIDC trusted publishing if the repo is registered

If you want a concrete installable artifact before CI publish, use the tarball
in `.artifacts/` and smoke-test it in a scratch project or consumer repo.

## License

MIT

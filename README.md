# @tummycrypt/tinyland-auth-pg

PostgreSQL storage adapter for [@tummycrypt/tinyland-auth](https://github.com/Jesssullivan/tinyland-auth), backed by [Neon Serverless Postgres](https://neon.tech) and [Drizzle ORM](https://orm.drizzle.team).

Implements the full `IStorageAdapter` interface from tinyland-auth, replacing in-memory or Redis-backed storage with durable PostgreSQL persistence. Designed for serverless environments (Vercel, Cloudflare Workers) via Neon's HTTP driver.

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

Factory function that returns a fully-implemented `IStorageAdapter`.

```typescript
interface PgStorageConfig {
  /** Neon connection string (required) */
  connectionString: string;
  /** Session TTL in milliseconds (default: 7 days) */
  sessionMaxAge?: number;
}
```

### `PgStorageAdapter`

Class implementing `IStorageAdapter` from `@tummycrypt/tinyland-auth/storage`. Key methods:

#### User Management
- `findUserById(id: string): Promise<AdminUser | null>`
- `findUserByHandle(handle: string): Promise<AdminUser | null>`
- `findUserByEmail(email: string): Promise<AdminUser | null>`
- `createUser(user: Omit<AdminUser, 'id'>): Promise<AdminUser>`
- `updateUser(id: string, updates: Partial<AdminUser>): Promise<AdminUser | null>`
- `listUsers(): Promise<AdminUser[]>`

#### Session Management
- `createSession(userId: string, metadata?: SessionMetadata): Promise<Session>`
- `getSession(sessionId: string): Promise<Session | null>`
- `deleteSession(sessionId: string): Promise<void>`
- `deleteUserSessions(userId: string): Promise<void>`
- `cleanExpiredSessions(): Promise<number>`

#### TOTP
- `storeTOTPSecret(userId: string, encrypted: EncryptedTOTPSecret): Promise<void>`
- `getTOTPSecret(userId: string): Promise<EncryptedTOTPSecret | null>`
- `deleteTOTPSecret(userId: string): Promise<void>`

#### Backup Codes
- `storeBackupCodes(userId: string, codes: BackupCodeSet): Promise<void>`
- `getBackupCodes(userId: string): Promise<BackupCodeSet | null>`

#### Invitations
- `createInvitation(invitation: AdminInvitation): Promise<void>`
- `getInvitationByToken(token: string): Promise<AdminInvitation | null>`
- `consumeInvitation(token: string): Promise<void>`

#### Audit Log
- `logAuditEvent(event: AuditEvent): Promise<void>`
- `getAuditEvents(filters?: AuditEventFilters): Promise<AuditEvent[]>`
- `countAuditEvents(filters?: AuditEventFilters): Promise<number>`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (pooled recommended for runtime, direct for migrations) |

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

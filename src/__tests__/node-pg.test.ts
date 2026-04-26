/**
 * node-postgres + tenant isolation smoke test via testcontainers.
 *
 * Exercises the owned-pool factory path end-to-end against a real Postgres 16.
 * Proves the new createNodePgStorageAdapter() path preserves the same tenant
 * scoping guarantees as the injected-driver path.
 *
 * SKIPS automatically when no Docker/Podman runtime is discoverable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createNodePgStorageAdapter } from '../adapter.js';
import { hasContainerRuntime } from './container-runtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe.skipIf(!hasContainerRuntime())(
	'node-postgres + tenant isolation smoke',
	() => {
		let container: StartedPostgreSqlContainer;
		let setupPool: Pool;
		let adapter: ReturnType<typeof createNodePgStorageAdapter>;

		const TENANT_A = '11111111-1111-1111-1111-111111111111';
		const TENANT_B = '22222222-2222-2222-2222-222222222222';

		beforeAll(async () => {
			container = await new PostgreSqlContainer(
				'postgres:16-alpine',
			).start();

			setupPool = new Pool({
				connectionString: container.getConnectionUri(),
			});

			const authDir = join(__dirname, '../../drizzle');
			const authFiles = readdirSync(authDir)
				.filter((f) => f.endsWith('.sql'))
				.sort();
			for (const f of authFiles) {
				const body = readFileSync(join(authDir, f), 'utf-8');
				await setupPool.query(body);
			}

			adapter = createNodePgStorageAdapter({
				connectionString: container.getConnectionUri(),
				poolConfig: { max: 4 },
			});
			await adapter.init();
		}, 120_000);

		afterAll(async () => {
			await adapter?.close();
			await setupPool?.end();
			await container?.stop();
		});

		it('createUser scopes by tenantId', async () => {
			const now = new Date().toISOString();

			const a = await adapter.createUser(TENANT_A, {
				handle: 'alice',
				email: 'alice@example.com',
				passwordHash: 'hash_a',
				role: 'admin',
				isActive: true,
				needsOnboarding: false,
				onboardingStep: 0,
				totpEnabled: false,
				createdAt: now,
				updatedAt: now,
			});
			const b = await adapter.createUser(TENANT_B, {
				handle: 'alice',
				email: 'alice@example.com',
				passwordHash: 'hash_b',
				role: 'admin',
				isActive: true,
				needsOnboarding: false,
				onboardingStep: 0,
				totpEnabled: false,
				createdAt: now,
				updatedAt: now,
			});

			expect(a.id).not.toBe(b.id);
			expect(a.tenantId).toBe(TENANT_A);
			expect(b.tenantId).toBe(TENANT_B);
		});

		it('getUserByHandle does not leak across tenants', async () => {
			const fromA = await adapter.getUserByHandle(TENANT_A, 'alice');
			const fromB = await adapter.getUserByHandle(TENANT_B, 'alice');

			expect(fromA?.passwordHash).toBe('hash_a');
			expect(fromB?.passwordHash).toBe('hash_b');
		});
	},
);

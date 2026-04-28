import { describe, it, expect } from 'vitest';
import type { AdminUser } from '@tummycrypt/tinyland-auth/types';
import {
	bootstrapUsers,
	type BootstrapUserStorage,
	type TenantScoped,
} from '../index.js';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

class FakeBootstrapStorage implements BootstrapUserStorage {
	private readonly users = new Map<string, TenantScoped<AdminUser>>();
	createCalls = 0;
	updateCalls = 0;

	constructor(seed: TenantScoped<AdminUser>[] = []) {
		for (const user of seed) {
			this.users.set(user.handle, user);
		}
	}

	async getUserByHandle(
		tenantId: string,
		handle: string,
	): Promise<TenantScoped<AdminUser> | null> {
		return this.users.get(handle.toLowerCase()) ?? null;
	}

	async createUser(
		tenantId: string,
		user: Omit<AdminUser, 'id' | 'tenantId'>,
	): Promise<TenantScoped<AdminUser>> {
		this.createCalls += 1;
		const created: TenantScoped<AdminUser> = {
			...user,
			id: `user_${this.createCalls}`,
			tenantId,
		};
		this.users.set(created.handle, created);
		return created;
	}

	async updateUser(
		tenantId: string,
		id: string,
		updates: Partial<AdminUser>,
	): Promise<TenantScoped<AdminUser>> {
		this.updateCalls += 1;
		const existing = [...this.users.values()].find((user) => user.id === id);
		if (!existing) {
			throw new Error(`User ${id} not found`);
		}

		const updated: TenantScoped<AdminUser> = {
			...existing,
			...updates,
			tenantId,
		};
		this.users.set(updated.handle, updated);
		return updated;
	}

	allUsers(): TenantScoped<AdminUser>[] {
		return [...this.users.values()];
	}
}

const user = (
	overrides: Partial<TenantScoped<AdminUser>> = {},
): TenantScoped<AdminUser> => ({
	id: 'existing',
	tenantId: TENANT_ID,
	handle: 'jess',
	email: 'jess@example.com',
	displayName: 'Jess',
	passwordHash: 'old_hash',
	role: 'viewer',
	isActive: true,
	needsOnboarding: false,
	onboardingStep: 0,
	totpEnabled: false,
	createdAt: '2026-04-28T00:00:00.000Z',
	updatedAt: '2026-04-28T00:00:00.000Z',
	...overrides,
});

describe('bootstrapUsers', () => {
	it('creates normalized users on cold start', async () => {
		const storage = new FakeBootstrapStorage();

		const result = await bootstrapUsers({
			storage,
			tenantId: TENANT_ID,
			passwordHasher: async (password) => `hash:${password}`,
			users: [
				{
					handle: ' Jess ',
					email: ' Jess@Example.COM ',
					displayName: ' Jess Sullivan ',
					pin: '123456',
					role: 'admin',
				},
			],
		});

		expect(result.created).toBe(1);
		expect(result.updated).toBe(0);
		expect(storage.createCalls).toBe(1);
		expect(storage.allUsers()[0]).toMatchObject({
			tenantId: TENANT_ID,
			handle: 'jess',
			email: 'jess@example.com',
			displayName: 'Jess Sullivan',
			passwordHash: 'hash:123456',
			role: 'admin',
			isActive: true,
			needsOnboarding: false,
			onboardingStep: 0,
			totpEnabled: false,
		});
	});

	it('reruns idempotently without creating duplicates', async () => {
		const storage = new FakeBootstrapStorage();
		const config = {
			storage,
			tenantId: TENANT_ID,
			passwordHasher: async (password: string) => `hash:${password}`,
			users: [
				{
					handle: 'jess',
					email: 'jess@example.com',
					displayName: 'Jess',
					pin: '123456',
					role: 'admin' as const,
				},
			],
		};

		await bootstrapUsers(config);
		const result = await bootstrapUsers(config);

		expect(result.created).toBe(0);
		expect(result.updated).toBe(1);
		expect(storage.createCalls).toBe(1);
		expect(storage.allUsers()).toHaveLength(1);
	});

	it('updates bootstrap-owned fields without resetting live auth state', async () => {
		const storage = new FakeBootstrapStorage([
			user({
				isActive: false,
				needsOnboarding: true,
				onboardingStep: 2,
				totpEnabled: true,
				permissions: ['posts:edit'],
			}),
		]);

		const result = await bootstrapUsers({
			storage,
			tenantId: TENANT_ID,
			passwordHasher: async (password) => `new:${password}`,
			users: [
				{
					handle: 'jess',
					email: 'jess@example.com',
					displayName: 'Jess Sullivan',
					password: 'new-pin',
					role: 'admin',
				},
			],
		});

		expect(result.updated).toBe(1);
		expect(storage.updateCalls).toBe(1);
		expect(storage.allUsers()[0]).toMatchObject({
			passwordHash: 'new:new-pin',
			role: 'admin',
			displayName: 'Jess Sullivan',
			isActive: false,
			needsOnboarding: true,
			onboardingStep: 2,
			totpEnabled: true,
			permissions: ['posts:edit'],
		});
	});

	it('can leave existing users unchanged when requested', async () => {
		const storage = new FakeBootstrapStorage([user()]);
		let hashCalls = 0;

		const result = await bootstrapUsers({
			storage,
			tenantId: TENANT_ID,
			updateExisting: false,
			passwordHasher: async (password) => {
				hashCalls += 1;
				return `new:${password}`;
			},
			users: [
				{
					handle: 'jess',
					email: 'jess@example.com',
					displayName: 'Jess Sullivan',
					password: 'new-pin',
					role: 'admin',
				},
			],
		});

		expect(result.unchanged).toBe(1);
		expect(storage.updateCalls).toBe(0);
		expect(hashCalls).toBe(0);
		expect(storage.allUsers()[0]).toMatchObject({
			passwordHash: 'old_hash',
			role: 'viewer',
		});
	});

	it('requires a password source for every user', async () => {
		const storage = new FakeBootstrapStorage();

		await expect(
			bootstrapUsers({
				storage,
				tenantId: TENANT_ID,
				users: [
					{
						handle: 'jess',
						email: 'jess@example.com',
						role: 'admin',
					},
				],
			}),
		).rejects.toThrow(
			'Bootstrap user jess must provide passwordHash, password, or pin',
		);
	});
});

/**
 * Intake Form Schema
 *
 * Template-driven digital intake forms with versioning.
 * Replaces paper PDF forms (general, TMD, prenatal).
 *
 * Templates use JSONB schemas describing sections/fields.
 * Responses are stored as JSONB keyed to the template schema.
 */

import { pgTable, uuid, varchar, integer, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { clients, bookings } from './booking-schema.js';

// ---------------------------------------------------------------------------
// Intake Form Templates
// ---------------------------------------------------------------------------

export const intakeFormTemplates = pgTable('intake_form_templates', {
	id: uuid('id').primaryKey().defaultRandom(),
	formType: varchar('form_type', { length: 64 }).notNull(), // 'general', 'tmd', 'prenatal'
	version: integer('version').notNull().default(1),
	title: varchar('title', { length: 255 }).notNull(),
	schema: jsonb('schema').notNull(), // JSON Schema describing sections/fields
	active: boolean('active').notNull().default(true),
	createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (table) => [
	index('idx_intake_tpl_type_version').on(table.formType, table.version),
]);

// ---------------------------------------------------------------------------
// Intake Form Responses
// ---------------------------------------------------------------------------

export const intakeFormResponses = pgTable('intake_form_responses', {
	id: uuid('id').primaryKey().defaultRandom(),
	templateId: uuid('template_id').references(() => intakeFormTemplates.id).notNull(),
	clientId: uuid('client_id').references(() => clients.id).notNull(),
	bookingId: uuid('booking_id').references(() => bookings.id),
	responses: jsonb('responses').notNull(), // client-entered data
	painAreas: jsonb('pain_areas'), // { regions: string[], primary?: string, notes?: string }
	consentText: text('consent_text').notNull(),
	consentedAt: timestamp('consented_at', { mode: 'string', withTimezone: true }),
	consentIp: varchar('consent_ip', { length: 45 }),
	status: varchar('status', { length: 32 }).notNull().default('draft'), // draft, submitted, reviewed
	reviewedBy: varchar('reviewed_by', { length: 64 }),
	reviewedAt: timestamp('reviewed_at', { mode: 'string', withTimezone: true }),
	therapistNotes: jsonb('therapist_notes'), // { stressReduction, recommendations, nextAppointment }
	createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (table) => [
	index('idx_intake_resp_client').on(table.clientId),
	index('idx_intake_resp_booking').on(table.bookingId),
	index('idx_intake_resp_template').on(table.templateId),
]);

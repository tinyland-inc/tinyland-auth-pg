CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens" time NOT NULL,
	"closes" time NOT NULL,
	"label" varchar(64),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(255),
	"street_address" varchar(255) NOT NULL,
	"suite_unit" varchar(64),
	"city" varchar(128) NOT NULL,
	"state" varchar(2) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"latitude" numeric(12, 8),
	"longitude" numeric(12, 8),
	"license_number" varchar(32),
	"description" text,
	"slogan" varchar(255),
	"website_url" varchar(512),
	"google_maps_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practitioners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"handle" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(128),
	"bio" text,
	"credentials" text[],
	"specializations" text[],
	"license_number" varchar(32),
	"photo_url" varchar(512),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reviewer_name" varchar(255) NOT NULL,
	"rating" smallint NOT NULL,
	"text" text NOT NULL,
	"source" varchar(64) DEFAULT 'google' NOT NULL,
	"tags" text[],
	"featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"acuity_id" varchar(64),
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(128),
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"acuity_id" integer,
	"client_name" varchar(255) NOT NULL,
	"client_email" varchar(255),
	"client_phone" varchar(32),
	"service" varchar(255) NOT NULL,
	"duration" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"payment_method" varchar(32),
	"appointment_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"service_id" varchar(128) NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"provider_id" varchar(128),
	"provider_name" varchar(255),
	"datetime" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"client" jsonb NOT NULL,
	"payment_method" varchar(32) NOT NULL,
	"payment_transaction_id" varchar(255),
	"amount_cents" integer NOT NULL,
	"payment_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reconciliation_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"acuity_appointment_id" varchar(64),
	"reconciled_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"appointment_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"processor" varchar(32) NOT NULL,
	"processor_ref" varchar(255) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"confirmation_code" varchar(16) NOT NULL,
	"service_id" uuid NOT NULL,
	"practitioner_id" uuid,
	"client_id" uuid NOT NULL,
	"datetime" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"status" varchar(32) DEFAULT 'confirmed' NOT NULL,
	"payment_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(32),
	"payment_ref" varchar(255),
	"amount_cents" integer NOT NULL,
	"notes" text,
	"idempotency_key" varchar(255),
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"opens" time,
	"closes" time,
	"reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" varchar(128) NOT NULL,
	"last_name" varchar(128) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32),
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slot_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"practitioner_id" uuid,
	"datetime" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"practitioner_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"block_type" varchar(32) NOT NULL,
	"title" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"amount_cents" integer NOT NULL,
	"balance_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"purchaser_name" varchar(255) NOT NULL,
	"purchaser_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"recipient_email" varchar(255),
	"message" text,
	"stripe_session_id" varchar(255),
	"stripe_payment_id" varchar(255),
	"issued_by" varchar(64),
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"client_id" uuid,
	"package_type" varchar(64) NOT NULL,
	"total_sessions" integer NOT NULL,
	"remaining_sessions" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"purchaser_name" varchar(255) NOT NULL,
	"purchaser_email" varchar(255) NOT NULL,
	"stripe_session_id" varchar(255),
	"stripe_payment_id" varchar(255),
	"issued_by" varchar(64),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"gift_certificate_id" uuid,
	"package_id" uuid,
	"type" varchar(16) NOT NULL,
	"amount_cents" integer,
	"session_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_form_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"booking_id" uuid,
	"responses" jsonb NOT NULL,
	"pain_areas" jsonb,
	"consent_text" text NOT NULL,
	"consented_at" timestamp with time zone,
	"consent_ip" varchar(45),
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"reviewed_by" varchar(64),
	"reviewed_at" timestamp with time zone,
	"therapist_notes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intake_form_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_type" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(255) NOT NULL,
	"schema" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_reservations" ADD CONSTRAINT "slot_reservations_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_practitioner_id_practitioners_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."practitioners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_gift_certificate_id_gift_certificates_id_fk" FOREIGN KEY ("gift_certificate_id") REFERENCES "public"."gift_certificates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_responses" ADD CONSTRAINT "intake_form_responses_template_id_intake_form_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."intake_form_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_responses" ADD CONSTRAINT "intake_form_responses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_form_responses" ADD CONSTRAINT "intake_form_responses_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_hours_tenant_idx" ON "business_hours" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "business_profile_tenant_idx" ON "business_profile" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practitioners_tenant_handle_unique" ON "practitioners" USING btree ("tenant_id","handle");--> statement-breakpoint
CREATE INDEX "practitioners_tenant_idx" ON "practitioners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reviews_tenant_idx" ON "reviews" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "services_tenant_acuity_id_unique" ON "services" USING btree ("tenant_id","acuity_id");--> statement-breakpoint
CREATE INDEX "services_tenant_idx" ON "services" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_tenant_acuity_id_unique" ON "appointments" USING btree ("tenant_id","acuity_id");--> statement-breakpoint
CREATE INDEX "appointments_tenant_idx" ON "appointments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "local_bookings_tenant_idx" ON "local_bookings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_tenant_confirmation_code_unique" ON "bookings" USING btree ("tenant_id","confirmation_code");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_tenant_idempotency_key_unique" ON "bookings" USING btree ("tenant_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_bookings_schedule" ON "bookings" USING btree ("practitioner_id","datetime");--> statement-breakpoint
CREATE INDEX "idx_bookings_client" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_datetime" ON "bookings" USING btree ("datetime");--> statement-breakpoint
CREATE INDEX "bookings_tenant_idx" ON "bookings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_overrides_tenant_date_unique" ON "business_hours_overrides" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "business_hours_overrides_tenant_idx" ON "business_hours_overrides" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_tenant_email_unique" ON "clients" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "clients_tenant_idx" ON "clients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_datetime" ON "slot_reservations" USING btree ("datetime");--> statement-breakpoint
CREATE INDEX "idx_reservations_expires" ON "slot_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "slot_reservations_tenant_idx" ON "slot_reservations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_time_blocks_schedule" ON "time_blocks" USING btree ("practitioner_id","start_time");--> statement-breakpoint
CREATE INDEX "time_blocks_tenant_idx" ON "time_blocks" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_certificates_tenant_code_unique" ON "gift_certificates" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_gc_code" ON "gift_certificates" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_gc_status" ON "gift_certificates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_gc_recipient_email" ON "gift_certificates" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "gift_certificates_tenant_idx" ON "gift_certificates" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_tenant_code_unique" ON "packages" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_pkg_code" ON "packages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_pkg_client" ON "packages" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_pkg_status" ON "packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "packages_tenant_idx" ON "packages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_booking" ON "redemptions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_gc" ON "redemptions" USING btree ("gift_certificate_id");--> statement-breakpoint
CREATE INDEX "idx_redemptions_pkg" ON "redemptions" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "redemptions_tenant_idx" ON "redemptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_intake_resp_client" ON "intake_form_responses" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_intake_resp_booking" ON "intake_form_responses" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_intake_resp_template" ON "intake_form_responses" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "intake_form_responses_tenant_idx" ON "intake_form_responses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_intake_tpl_type_version" ON "intake_form_templates" USING btree ("form_type","version");--> statement-breakpoint
CREATE INDEX "intake_form_templates_tenant_idx" ON "intake_form_templates" USING btree ("tenant_id");
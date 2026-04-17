CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TABLE "auth"."audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(64) NOT NULL,
	"user_id" uuid,
	"target_user_id" uuid,
	"handle" varchar(64),
	"ip_address" varchar(45),
	"user_agent" text,
	"details" jsonb NOT NULL,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"source" varchar(16) DEFAULT 'system' NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."backup_codes" (
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"codes" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "backup_codes_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "auth"."invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"token" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_by" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"used_by" uuid,
	"temporary_totp_secret" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_data" jsonb,
	"client_ip" varchar(45) DEFAULT 'unknown' NOT NULL,
	"client_ip_masked" varchar(45),
	"user_agent" text DEFAULT 'unknown' NOT NULL,
	"device_type" varchar(16) DEFAULT 'unknown',
	"browser_fingerprint" text,
	"geo_location" jsonb,
	"temp_totp_secret" text,
	"temp_totp_expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "auth"."totp_secrets" (
	"tenant_id" uuid NOT NULL,
	"handle" varchar(64) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"encrypted_secret" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"salt" text NOT NULL,
	"backup_codes_generated" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "totp_secrets_tenant_id_handle_pk" PRIMARY KEY("tenant_id","handle")
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"handle" varchar(64) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(128),
	"password_hash" text NOT NULL,
	"role" varchar(32) DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_locked" boolean DEFAULT false,
	"lock_reason" text,
	"locked_at" timestamp,
	"needs_onboarding" boolean DEFAULT true NOT NULL,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"first_login" boolean DEFAULT true,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_secret_id" varchar(128),
	"permissions" jsonb,
	"bio" text,
	"avatar_url" text,
	"pronouns" varchar(32),
	"timezone" varchar(64),
	"locale" varchar(16),
	"theme" varchar(8),
	"email_notifications" boolean DEFAULT true,
	"login_attempts" integer DEFAULT 0,
	"last_failed_login_at" timestamp,
	"last_login_at" timestamp,
	"password_changed_at" timestamp,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_tenant_idx" ON "auth"."audit_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "backup_codes_tenant_idx" ON "auth"."backup_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_tenant_token_unique" ON "auth"."invitations" USING btree ("tenant_id","token");--> statement-breakpoint
CREATE INDEX "invitations_tenant_idx" ON "auth"."invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_tenant_idx" ON "auth"."sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "totp_secrets_tenant_idx" ON "auth"."totp_secrets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_handle_unique" ON "auth"."users" USING btree ("tenant_id","handle");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_unique" ON "auth"."users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "auth"."users" USING btree ("tenant_id");
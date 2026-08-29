CREATE TABLE `analysis_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`evaluation_id` text NOT NULL,
	`job_type` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`lease_until` integer,
	`error_code` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `athlete_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`target_value` integer,
	`current_value` integer DEFAULT 0 NOT NULL,
	`target_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`coach_note` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`status` text NOT NULL,
	`provider_invoice_id` text,
	`due_at` integer,
	`paid_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`action_url` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`dedupe_key` text,
	`scheduled_at` integer NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_events` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`actor_email` text,
	`event_name` text NOT NULL,
	`object_type` text,
	`object_id` text,
	`properties_json` text,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `service_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`impact` text NOT NULL,
	`owner_email` text,
	`opened_at` integer NOT NULL,
	`resolved_at` integer
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`plan_code` text NOT NULL,
	`status` text DEFAULT 'trialing' NOT NULL,
	`billing_provider` text DEFAULT 'manual' NOT NULL,
	`provider_customer_id` text,
	`provider_subscription_id` text,
	`athlete_limit` integer DEFAULT 10 NOT NULL,
	`storage_limit_bytes` integer DEFAULT 10737418240 NOT NULL,
	`current_period_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`name` text NOT NULL,
	`objective` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`weekly_sessions` integer NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_meters` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`metric` text NOT NULL,
	`quantity` integer NOT NULL,
	`period_key` text NOT NULL,
	`recorded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `analysis_jobs_queue_idx` ON `analysis_jobs` (`academy_id`,`status`,`priority`,`created_at`);
--> statement-breakpoint
CREATE INDEX `athlete_goals_owner_idx` ON `athlete_goals` (`academy_id`,`athlete_id`,`status`);
--> statement-breakpoint
CREATE INDEX `training_blocks_owner_idx` ON `training_blocks` (`academy_id`,`athlete_id`,`start_date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_dedupe_idx` ON `notifications` (`academy_id`,`dedupe_key`);
--> statement-breakpoint
CREATE INDEX `product_events_period_idx` ON `product_events` (`academy_id`,`occurred_at`,`event_name`);
--> statement-breakpoint
CREATE INDEX `subscriptions_academy_idx` ON `subscriptions` (`academy_id`,`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `usage_meters_period_idx` ON `usage_meters` (`academy_id`,`period_key`,`metric`);

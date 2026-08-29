CREATE TABLE `academy_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`legal_name` text,
	`display_name` text NOT NULL,
	`timezone` text DEFAULT 'America/Chicago' NOT NULL,
	`contact_email` text NOT NULL,
	`onboarding_status` text DEFAULT 'profile' NOT NULL,
	`terms_accepted_at` integer,
	`privacy_accepted_at` integer,
	`configured_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backup_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`object_key` text NOT NULL,
	`record_count` integer NOT NULL,
	`byte_size` integer NOT NULL,
	`checksum` text NOT NULL,
	`status` text NOT NULL,
	`verified_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text,
	`provider_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`payload_hash` text NOT NULL,
	`processed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `launch_gate_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`gate_code` text NOT NULL,
	`status` text NOT NULL,
	`evidence` text,
	`assessed_by` text NOT NULL,
	`assessed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academy_settings_academy_idx` ON `academy_settings` (`academy_id`);
--> statement-breakpoint
CREATE INDEX `backup_runs_academy_idx` ON `backup_runs` (`academy_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_events_provider_idx` ON `billing_events` (`provider_event_id`);
--> statement-breakpoint
CREATE INDEX `launch_gate_history_idx` ON `launch_gate_assessments` (`academy_id`,`gate_code`,`assessed_at`);

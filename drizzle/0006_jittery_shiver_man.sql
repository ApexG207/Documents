CREATE TABLE `deletion_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`media_id` text NOT NULL,
	`object_key_hash` text NOT NULL,
	`policy_id` text,
	`reason` text NOT NULL,
	`deleted_by` text NOT NULL,
	`outcome` text NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `legal_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`media_id` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`authorized_by` text NOT NULL,
	`placed_at` integer NOT NULL,
	`released_by` text,
	`released_at` integer
);
--> statement-breakpoint
CREATE TABLE `media_derivatives` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`source_media_id` text NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`retention_policy_id` text,
	`retention_until` integer,
	`legal_hold` integer DEFAULT false NOT NULL,
	`byte_size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `storage_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`name` text NOT NULL,
	`active_days` integer DEFAULT 90 NOT NULL,
	`retained_days` integer DEFAULT 365 NOT NULL,
	`delete_after_days` integer DEFAULT 365 NOT NULL,
	`temporary_days` integer DEFAULT 7 NOT NULL,
	`draft_evaluation_days` integer DEFAULT 90 NOT NULL,
	`verified_evaluation_days` integer DEFAULT 1095 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `storage_usage_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`usage_date` text NOT NULL,
	`object_count` integer NOT NULL,
	`total_bytes` integer NOT NULL,
	`standard_bytes` integer NOT NULL,
	`infrequent_bytes` integer NOT NULL,
	`captured_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `media_objects` ADD `retention_policy_id` text;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `storage_class` text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `lifecycle_state` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `legal_hold` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `byte_size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `parent_media_id` text;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `last_accessed_at` integer;--> statement-breakpoint
ALTER TABLE `media_objects` ADD `deleted_at` integer;
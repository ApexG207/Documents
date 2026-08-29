CREATE TABLE `consents` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_id` text NOT NULL,
	`parent_email` text NOT NULL,
	`scope` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`name` text NOT NULL,
	`event_date` integer NOT NULL,
	`ruleset` text NOT NULL,
	`registration_deadline` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` integer NOT NULL
);

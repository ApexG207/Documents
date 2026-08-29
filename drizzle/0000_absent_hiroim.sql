CREATE TABLE `academies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plan` text DEFAULT 'pilot' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`use_case` text NOT NULL,
	`input_class` text NOT NULL,
	`output_status` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `athletes` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`alias` text NOT NULL,
	`birth_year` integer NOT NULL,
	`belt` text NOT NULL,
	`consent_status` text DEFAULT 'pending' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `competition_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_id` text NOT NULL,
	`event_name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`coach_intent` text NOT NULL,
	`approved_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media_objects` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_id` text NOT NULL,
	`object_key` text NOT NULL,
	`kind` text NOT NULL,
	`consent_scope` text NOT NULL,
	`retention_until` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`athlete_id` text NOT NULL,
	`author_email` text NOT NULL,
	`category` text NOT NULL,
	`rating` integer NOT NULL,
	`note` text,
	`observed_at` integer NOT NULL
);

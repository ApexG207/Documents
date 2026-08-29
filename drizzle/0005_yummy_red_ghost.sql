CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`session_date` integer NOT NULL,
	`class_type` text NOT NULL,
	`status` text NOT NULL,
	`recorded_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `curriculum_items` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`rank_band` text NOT NULL,
	`required_level` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);

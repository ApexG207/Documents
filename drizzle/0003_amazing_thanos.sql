CREATE TABLE `promotion_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`current_rank` text NOT NULL,
	`target_rank` text NOT NULL,
	`technical_score` integer NOT NULL,
	`attendance_score` integer NOT NULL,
	`competition_score` integer NOT NULL,
	`character_score` integer NOT NULL,
	`coach_status` text DEFAULT 'developing' NOT NULL,
	`coach_note` text,
	`reviewed_by` text,
	`reviewed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `skill_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`domain` text NOT NULL,
	`skill_name` text NOT NULL,
	`level` integer NOT NULL,
	`evidence` text,
	`assessed_by` text NOT NULL,
	`assessed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`session_type` text NOT NULL,
	`session_date` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`intensity` integer NOT NULL,
	`focus` text NOT NULL,
	`notes` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`media_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`event_name` text NOT NULL,
	`division` text,
	`result` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`analysis_json` text,
	`coach_verified_by` text,
	`created_at` integer NOT NULL
);

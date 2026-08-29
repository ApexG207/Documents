CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`object_type` text NOT NULL,
	`object_id` text,
	`outcome` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rights_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`requester_email` text NOT NULL,
	`athlete_id` text,
	`request_type` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`due_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL
);

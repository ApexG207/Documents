CREATE TABLE `video_markers` (
	`id` text PRIMARY KEY NOT NULL,
	`academy_id` text NOT NULL,
	`evaluation_id` text NOT NULL,
	`athlete_id` text NOT NULL,
	`second` integer NOT NULL,
	`category` text NOT NULL,
	`outcome` text NOT NULL,
	`note` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);

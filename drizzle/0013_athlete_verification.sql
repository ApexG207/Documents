ALTER TABLE `user_profiles` ADD `avatar_object_key` text;
ALTER TABLE `user_profiles` ADD `avatar_content_type` text;
ALTER TABLE `user_profiles` ADD `avatar_updated_at` integer;
CREATE TABLE `athlete_verification_requests` (`id` text PRIMARY KEY NOT NULL,`athlete_email` text NOT NULL,`athlete_display_name` text NOT NULL,`academy_name` text NOT NULL,`verifier_email` text NOT NULL,`claimed_birth_year` integer NOT NULL,`claimed_belt` text NOT NULL,`claimed_membership_status` text DEFAULT 'active' NOT NULL,`status` text DEFAULT 'pending_delivery' NOT NULL,`token_hash` text NOT NULL,`token_expires_at` integer NOT NULL,`membership_confirmed` integer,`age_confirmed` integer,`belt_confirmed` integer,`verified_by_name` text,`verified_by_title` text,`verifier_note` text,`responded_at` integer,`verification_expires_at` integer,`created_at` integer NOT NULL,`updated_at` integer NOT NULL);
CREATE TABLE `athlete_verification_events` (`id` text PRIMARY KEY NOT NULL,`request_id` text NOT NULL,`event_type` text NOT NULL,`outcome` text NOT NULL,`actor_email` text,`metadata_json` text,`created_at` integer NOT NULL);
CREATE UNIQUE INDEX `athlete_verification_token_unique` ON `athlete_verification_requests` (`token_hash`);
CREATE INDEX `athlete_verification_owner_idx` ON `athlete_verification_requests` (`athlete_email`,`created_at`);
CREATE INDEX `athlete_verification_status_idx` ON `athlete_verification_requests` (`status`,`token_expires_at`);

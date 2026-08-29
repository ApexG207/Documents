CREATE TABLE `account_deletion_requests` (`id` text PRIMARY KEY NOT NULL,`user_email` text NOT NULL,`status` text DEFAULT 'scheduled' NOT NULL,`reason` text,`scheduled_for` integer NOT NULL,`legal_hold` integer DEFAULT false NOT NULL,`completed_at` integer,`created_at` integer NOT NULL,`updated_at` integer NOT NULL);
CREATE UNIQUE INDEX `account_deletion_active_unique` ON `account_deletion_requests` (`user_email`) WHERE `status` IN ('scheduled','processing','held');
CREATE INDEX `account_deletion_due_idx` ON `account_deletion_requests` (`status`,`scheduled_for`);
CREATE TABLE `content_reports` (`id` text PRIMARY KEY NOT NULL,`reporter_email` text NOT NULL,`subject_type` text NOT NULL,`subject_id` text NOT NULL,`reason` text NOT NULL,`details` text,`status` text DEFAULT 'received' NOT NULL,`priority` text DEFAULT 'standard' NOT NULL,`reviewed_by` text,`reviewed_at` integer,`created_at` integer NOT NULL,`updated_at` integer NOT NULL);
CREATE INDEX `content_report_status_idx` ON `content_reports` (`status`,`priority`,`created_at`);
CREATE TABLE `user_blocks` (`id` text PRIMARY KEY NOT NULL,`blocker_email` text NOT NULL,`blocked_email` text NOT NULL,`status` text DEFAULT 'active' NOT NULL,`created_at` integer NOT NULL,`updated_at` integer NOT NULL);
CREATE UNIQUE INDEX `user_block_pair_unique` ON `user_blocks` (`blocker_email`,`blocked_email`);
CREATE TABLE `moderation_actions` (`id` text PRIMARY KEY NOT NULL,`report_id` text,`actor_email` text NOT NULL,`action` text NOT NULL,`subject_type` text NOT NULL,`subject_id` text NOT NULL,`rationale` text NOT NULL,`created_at` integer NOT NULL);
CREATE INDEX `moderation_subject_idx` ON `moderation_actions` (`subject_type`,`subject_id`,`created_at`);

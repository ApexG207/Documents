ALTER TABLE `media_objects` ADD `academy_id` text;--> statement-breakpoint
UPDATE `media_objects` SET `academy_id` = (SELECT `athletes`.`academy_id` FROM `athletes` WHERE `athletes`.`id` = `media_objects`.`athlete_id`) WHERE `academy_id` IS NULL;--> statement-breakpoint
CREATE INDEX `media_objects_academy_idx` ON `media_objects` (`academy_id`,`lifecycle_state`);--> statement-breakpoint
ALTER TABLE `consents` ADD `academy_id` text;--> statement-breakpoint
UPDATE `consents` SET `academy_id` = (SELECT `athletes`.`academy_id` FROM `athletes` WHERE `athletes`.`id` = `consents`.`athlete_id`) WHERE `academy_id` IS NULL;--> statement-breakpoint
CREATE INDEX `consents_academy_idx` ON `consents` (`academy_id`,`athlete_id`,`status`);

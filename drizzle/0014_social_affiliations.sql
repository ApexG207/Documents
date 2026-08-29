ALTER TABLE `user_profiles` ADD `social_links_json` text DEFAULT '{}' NOT NULL;
ALTER TABLE `user_profiles` ADD `team_affiliations_json` text DEFAULT '[]' NOT NULL;
ALTER TABLE `academy_profiles` ADD `social_links_json` text DEFAULT '{}' NOT NULL;
ALTER TABLE `academy_profiles` ADD `team_affiliations_json` text DEFAULT '[]' NOT NULL;

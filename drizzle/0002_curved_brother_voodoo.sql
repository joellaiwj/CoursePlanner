CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);--> statement-breakpoint
INSERT INTO `app_users` (`id`, `email`, `display_name`, `password_salt`, `password_hash`) VALUES
('demo-user-abc', 'abc@demo.local', 'ABC User', 'f8c48c3494bdefcb75a70c8f4143830d', '0a0d6ed74e338ef41d1a62e747e19677de4ea3d7186df5d6e52d8e702b8cb585'),
('demo-user-cde', 'cde@demo.local', 'CDE User', '2ffcf9161e6e4f81dea361ccfdbe34e4', 'cf8c220c46b3cdbeb497bf0141f9e8e7c0297f6dc8de7e90356252215062635d'),
('demo-user-fgh', 'fgh@demo.local', 'FGH User', '2680b9e52cc1adc8b1185a5e0f2e1c7e', 'bb8155e4b77d45ef539478410e51b503da5afb49547a857116db93ad28db3dab');--> statement-breakpoint
UPDATE `planner_drafts` SET `owner_id` = 'demo-user-abc' WHERE `owner_id` = 'ab036837-573e-4930-aa90-fd22a72a6b78';

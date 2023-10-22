CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text,
	`password_hash` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`is_admin` integer DEFAULT false,
	`is_approved` integer DEFAULT false
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
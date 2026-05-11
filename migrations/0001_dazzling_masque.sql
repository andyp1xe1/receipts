DROP INDEX `receipts_canonical_key_idx`;--> statement-breakpoint
ALTER TABLE `receipts` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `receipts_user_id_idx` ON `receipts` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `role` text DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `banned` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `user` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `user` ADD `banExpires` integer;--> statement-breakpoint
UPDATE `user` SET `role` = 'ADMIN' WHERE `id` = (SELECT `id` FROM `user` ORDER BY `createdAt` ASC LIMIT 1);--> statement-breakpoint
UPDATE `receipts` SET `user_id` = (SELECT `id` FROM `user` ORDER BY `createdAt` ASC LIMIT 1) WHERE `user_id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_canonical_key_idx` ON `receipts` (`user_id`,`ecc_id`,`url_total`,`url_receipt_number`,`url_date`);

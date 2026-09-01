PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_planner_drafts` (
	`owner_id` text NOT NULL,
	`course_code` text NOT NULL,
	`course_title` text NOT NULL,
	`draft_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`owner_id`, `course_code`)
);
--> statement-breakpoint
INSERT INTO `__new_planner_drafts`("owner_id", "course_code", "course_title", "draft_json", "updated_at") SELECT 'ab036837-573e-4930-aa90-fd22a72a6b78', "course_code", "course_title", "draft_json", "updated_at" FROM `planner_drafts`;--> statement-breakpoint
DROP TABLE `planner_drafts`;--> statement-breakpoint
ALTER TABLE `__new_planner_drafts` RENAME TO `planner_drafts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

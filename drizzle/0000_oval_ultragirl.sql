CREATE TABLE `planner_drafts` (
	`course_code` text PRIMARY KEY NOT NULL,
	`course_title` text NOT NULL,
	`draft_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

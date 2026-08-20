import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plannerDrafts = sqliteTable("planner_drafts", {
  courseCode: text("course_code").primaryKey(),
  courseTitle: text("course_title").notNull(),
  draftJson: text("draft_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

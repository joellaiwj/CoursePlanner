import { sql } from "drizzle-orm";
import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plannerDrafts = sqliteTable("planner_drafts", {
  ownerId: text("owner_id").notNull(),
  courseCode: text("course_code").notNull(),
  courseTitle: text("course_title").notNull(),
  draftJson: text("draft_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.ownerId, table.courseCode] })]);

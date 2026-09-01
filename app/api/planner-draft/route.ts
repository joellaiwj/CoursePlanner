import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { plannerDrafts } from "../../../db/schema";

export const runtime = "edge";

const MAX_DRAFT_BYTES = 1_000_000;

function courseCodeFrom(request: Request) {
  return new URL(request.url).searchParams.get("courseCode")?.trim().slice(0, 100) ?? "";
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const unavailable = message.includes("no such table") || message.includes("D1 binding");
  return Response.json({ error: unavailable ? "Draft storage is being prepared. Please try again shortly." : "The draft could not be saved or loaded." }, { status: 500 });
}

export async function GET(request: Request) {
  const courseCode = courseCodeFrom(request);
  try {
    if (!courseCode) {
      const rows = await getDb().select().from(plannerDrafts).orderBy(desc(plannerDrafts.updatedAt)).limit(100);
      const deletedPlannerKeys: string[] = [];
      const planners = rows.flatMap((row) => {
        try {
          const draft = JSON.parse(row.draftJson) as { courseCode?: unknown; courseTitle?: unknown; deleted?: unknown };
          if (draft.deleted === true) {
            deletedPlannerKeys.push(row.courseCode);
            return [];
          }
          return [{ plannerKey: row.courseCode, courseCode: typeof draft.courseCode === "string" ? draft.courseCode : row.courseCode, courseTitle: typeof draft.courseTitle === "string" ? draft.courseTitle : row.courseTitle, updatedAt: row.updatedAt }];
        } catch {
          return [];
        }
      });
      return Response.json({ planners, deletedPlannerKeys });
    }
    const [row] = await getDb().select().from(plannerDrafts).where(eq(plannerDrafts.courseCode, courseCode)).limit(1);
    if (!row) return Response.json({ draft: null });
    const draft = JSON.parse(row.draftJson) as { deleted?: unknown };
    if (draft.deleted === true) return Response.json({ draft: null, deleted: true });
    return Response.json({ draft, updatedAt: row.updatedAt });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const courseCode = courseCodeFrom(request);
  if (!courseCode) return Response.json({ error: "Course code is required." }, { status: 400 });
  try {
    await getDb().insert(plannerDrafts).values({ courseCode, courseTitle: "Deleted course", draftJson: JSON.stringify({ deleted: true }) }).onConflictDoUpdate({ target: plannerDrafts.courseCode, set: { courseTitle: "Deleted course", draftJson: JSON.stringify({ deleted: true }), updatedAt: sql`CURRENT_TIMESTAMP` } });
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as { courseCode?: unknown; courseTitle?: unknown; draft?: unknown };
    const courseCode = typeof payload.courseCode === "string" ? payload.courseCode.trim().slice(0, 100) : "";
    const courseTitle = typeof payload.courseTitle === "string" ? payload.courseTitle.trim().slice(0, 300) : "";
    if (!courseCode || !courseTitle || !payload.draft || typeof payload.draft !== "object") return Response.json({ error: "Course code, title and draft are required." }, { status: 400 });
    const draftJson = JSON.stringify(payload.draft);
    if (new TextEncoder().encode(draftJson).byteLength > MAX_DRAFT_BYTES) return Response.json({ error: "This draft is too large to save." }, { status: 413 });
    const db = getDb();
    await db.insert(plannerDrafts).values({ courseCode, courseTitle, draftJson }).onConflictDoUpdate({ target: plannerDrafts.courseCode, set: { courseTitle, draftJson, updatedAt: sql`CURRENT_TIMESTAMP` } });
    const [row] = await db.select({ updatedAt: plannerDrafts.updatedAt }).from(plannerDrafts).where(eq(plannerDrafts.courseCode, courseCode)).limit(1);
    return Response.json({ saved: true, updatedAt: row?.updatedAt ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}

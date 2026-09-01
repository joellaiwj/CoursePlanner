import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers, plannerDrafts } from "../../../../db/schema";
import { authenticatedUserId } from "../../../../lib/request-auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const ownerId = await authenticatedUserId(request);
  if (!ownerId) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { courseCode?: unknown; recipientEmail?: unknown } | null;
  const courseCode = typeof payload?.courseCode === "string" ? payload.courseCode.trim().slice(0, 100) : "";
  const recipientEmail = typeof payload?.recipientEmail === "string" ? payload.recipientEmail.trim().toLowerCase().slice(0, 254) : "";
  if (!courseCode || !recipientEmail) return Response.json({ error: "Course and recipient email are required." }, { status: 400 });

  const db = getDb();
  const [recipient] = await db.select({ id: appUsers.id, email: appUsers.email, displayName: appUsers.displayName }).from(appUsers).where(eq(appUsers.email, recipientEmail)).limit(1);
  if (!recipient) return Response.json({ error: "No Course Agentic Planner account uses that email address." }, { status: 404 });
  if (recipient.id === ownerId) return Response.json({ error: "Choose another user. This course is already in your workspace." }, { status: 400 });

  const [source] = await db.select().from(plannerDrafts).where(and(eq(plannerDrafts.ownerId, ownerId), eq(plannerDrafts.courseCode, courseCode))).limit(1);
  if (!source) return Response.json({ error: "Save this course before sharing it." }, { status: 404 });
  const sourceDraft = JSON.parse(source.draftJson) as { deleted?: unknown };
  if (sourceDraft.deleted === true) return Response.json({ error: "This course is no longer available." }, { status: 404 });

  const [existing] = await db.select({ courseCode: plannerDrafts.courseCode }).from(plannerDrafts).where(and(eq(plannerDrafts.ownerId, recipient.id), eq(plannerDrafts.courseCode, courseCode))).limit(1);
  if (existing) return Response.json({ error: `${recipient.displayName} already has a course with code ${courseCode}.` }, { status: 409 });

  await db.insert(plannerDrafts).values({ ownerId: recipient.id, courseCode: source.courseCode, courseTitle: source.courseTitle, draftJson: source.draftJson });
  return Response.json({ shared: true, recipient: { email: recipient.email, displayName: recipient.displayName } });
}

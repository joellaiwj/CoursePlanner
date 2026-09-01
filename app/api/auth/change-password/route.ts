import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers } from "../../../../db/schema";
import { hashPassword, verifyPassword } from "../../../../lib/password";
import { authenticatedUserId } from "../../../../lib/request-auth";

export const runtime = "edge";

export async function POST(request: Request) {
  const userId = await authenticatedUserId(request);
  if (!userId) return Response.json({ error: "Sign in is required." }, { status: 401 });
  const payload = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  const currentPassword = typeof payload?.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload?.newPassword === "string" ? payload.newPassword : "";
  if (!currentPassword || newPassword.length < 8 || newPassword.length > 200) return Response.json({ error: "The new password must be between 8 and 200 characters." }, { status: 400 });
  if (currentPassword === newPassword) return Response.json({ error: "Choose a new password that differs from your current password." }, { status: 400 });

  const db = getDb();
  const [user] = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordSalt, user.passwordHash))) return Response.json({ error: "Your current password is incorrect." }, { status: 401 });
  const next = await hashPassword(newPassword);
  await db.update(appUsers).set({ passwordSalt: next.salt, passwordHash: next.hash }).where(eq(appUsers.id, userId));
  return Response.json({ changed: true });
}

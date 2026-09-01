import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers } from "../../../../db/schema";
import { authenticatedUserId } from "../../../../lib/request-auth";
export const runtime = "edge";
export async function GET(request: Request) {
  const userId = await authenticatedUserId(request);
  if (!userId) return Response.json({ user: null }, { status: 401 });
  const [user] = await getDb().select({ id: appUsers.id, email: appUsers.email, displayName: appUsers.displayName }).from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  return user ? Response.json({ user }) : Response.json({ user: null }, { status: 401 });
}

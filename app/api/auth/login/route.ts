import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { appUsers } from "../../../../db/schema";
import { verifyPassword } from "../../../../lib/password";
import { createSessionCookie } from "../../../../lib/request-auth";
export const runtime = "edge";
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (!email || !password || password.length > 200) return Response.json({ error: "Enter your email and password." }, { status: 400 });
  const [user] = await getDb().select().from(appUsers).where(eq(appUsers.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) return Response.json({ error: "The email or password is incorrect." }, { status: 401 });
  return Response.json({ user: { id: user.id, email: user.email, displayName: user.displayName } }, { headers: { "Set-Cookie": await createSessionCookie(user.id) } });
}

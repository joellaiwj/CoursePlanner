const COOKIE_NAME = "course_planner_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) { return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}
async function signature(value: string) {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("APP_SESSION_SECRET is not configured");
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? "";
}
export async function authenticatedUserId(request: Request) {
  const [userId, expiresAt, suppliedSignature] = cookieValue(request).split(".");
  if (!userId || !expiresAt || !suppliedSignature || Number(expiresAt) <= Date.now()) return null;
  const expectedSignature = await signature(`${userId}.${expiresAt}`);
  return timingSafeEqual(suppliedSignature, expectedSignature) ? userId : null;
}
export async function createSessionCookie(userId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const value = `${userId}.${expiresAt}`;
  return `${COOKIE_NAME}=${value}.${await signature(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}
export function clearSessionCookie() { return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

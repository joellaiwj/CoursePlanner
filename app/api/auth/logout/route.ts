import { clearSessionCookie } from "../../../../lib/request-auth";
export const runtime = "edge";
export async function POST() { return Response.json({ signedOut: true }, { headers: { "Set-Cookie": clearSessionCookie() } }); }
